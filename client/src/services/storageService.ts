
import { Song } from '../types';

// Função auxiliar para converter File para Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:audio/mpeg;base64," para enviar apenas o base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Função auxiliar para calcular duração do áudio
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(Math.floor(audio.duration));
    });
    audio.addEventListener('error', () => {
      console.warn('[Audio] Não foi possível calcular duração, usando 0');
      resolve(0);
    });
    audio.src = URL.createObjectURL(file);
  });
};

// Helper para chamar API tRPC
const callTRPC = async (path: string, input: any, method: 'query' | 'mutation') => {
  const url = method === 'query' 
    ? `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `/api/trpc/${path}`;
  
  const options: RequestInit = method === 'mutation' 
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    : { method: 'GET' };
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }
  
  const data = await response.json();
  return data.result?.data || data.result;
};

// 1. CRIAR PASTA (Simulada no R2)
export const createFolderInR2 = async (folderName: string) => {
  try {
    console.log(`[R2] Criando pasta: ${folderName}`);
    
    const result = await callTRPC('r2.createFolder', { folderName }, 'mutation');
    
    console.log(`[R2] Pasta '${folderName}' criada com sucesso.`);
    return result.success;
  } catch (error: any) {
    console.error("[R2] Erro ao criar pasta:", error);
    return false;
  }
};

// 2. UPLOAD DE MÚSICA (via Backend)
export const uploadSongToR2 = async (file: File, folderName: string = "Geral"): Promise<Song> => {
  try {
    console.log(`[R2] Iniciando upload de: ${file.name}`);
    console.log(`   Pasta: ${folderName}`);
    console.log(`   Tamanho: ${file.size} bytes`);
    
    // Converter arquivo para base64
    const fileBase64 = await fileToBase64(file);
    
    // Calcular duração do áudio
    const duration = await getAudioDuration(file);
    
    // Enviar para o backend
    const result = await callTRPC('r2.uploadSong', {
      fileBase64: fileBase64,
      fileName: file.name,
      folderName: folderName,
      contentType: file.type || 'audio/mpeg',
    }, 'mutation');
    
    console.log("[R2] Upload OK! URL:", result.url);
    
    // Extrair artista e título do nome do arquivo
    const displayName = file.name.replace(/\.[^/.]+$/, "");
    const [artist, title] = displayName.includes('-') 
      ? displayName.split('-').map(s => s.trim()) 
      : ["Desconhecido", displayName];
    
    return {
      id: crypto.randomUUID(),
      title: title || displayName,
      artist: artist || "Artista Desconhecido",
      url: result.url,
      duration: duration,
      file: undefined
    };

  } catch (error: any) {
    console.error("[R2] Erro Fatal:", error);
    const msg = `Erro no envio: ${error.message || 'Erro desconhecido'}`;
    alert(msg);
    throw error;
  }
};

// 3. SINCRONIZAR PASTA (RECUPERAR ARQUIVOS EXISTENTES)
export const listFilesFromR2 = async (folderName: string): Promise<Song[]> => {
  try {
    console.log(`[R2 Sync] Buscando arquivos em: ${folderName}`);
    
    const files = await callTRPC('r2.listFiles', { folderName }, 'query');
    
    console.log(`[R2 Sync] Encontrados ${files.length} arquivos.`);
    
    return files.map((file: any) => ({
      id: crypto.randomUUID(),
      title: file.title,
      artist: file.artist,
      url: file.url,
      duration: 0,
      isJingle: false
    }));

  } catch (error: any) {
    console.error("[R2 Sync] Erro ao listar arquivos:", error);
    alert(`Erro ao sincronizar pasta R2: ${error.message}`);
    return [];
  }
};
