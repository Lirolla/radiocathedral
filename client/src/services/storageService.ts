import { Song } from '../types';

// URL Pública do R2
const PUBLIC_R2_DOMAIN = "https://musica.radiotocai.com";

// Função auxiliar para limpar nomes
const sanitizeString = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9.\-_]/g, "_"); // Substitui espaços por _
};

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

// 1. CRIAR PASTA (via API do backend)
// NOTA: Esta função não deve ser chamada diretamente do frontend
// Use o App.tsx createPlaylist que já chama createFolderInR2 do backend
export const createFolderInR2 = async (folderName: string): Promise<boolean> => {
    console.warn("[R2] createFolderInR2 foi chamado do frontend - isso não deveria acontecer!");
    console.warn("[R2] A criação de pastas deve ser feita pelo backend automaticamente.");
    return true; // Retorna true para não bloquear o fluxo
};

// 2. UPLOAD DE MÚSICA (via API do backend)
export const uploadSongToR2 = async (file: File, folderName: string = "Geral"): Promise<Song> => {
  const safeFolderName = sanitizeString(folderName);
  const safeFileName = sanitizeString(file.name);
  
  // Metadados
  const displayName = file.name.replace(/\.[^/.]+$/, "");
  const [artist, title] = displayName.includes('-') 
    ? displayName.split('-').map(s => s.trim()) 
    : ["Desconhecido", displayName];

  try {
    console.log(`[R2] Iniciando upload...`);
    console.log(`   Arquivo: ${file.name}`);
    console.log(`   Pasta: ${safeFolderName}`);
    console.log(`   Tamanho: ${file.size} bytes`);
    
    // Converter arquivo para base64
    const fileBase64 = await fileToBase64(file);
    
    // Calcular duração
    const duration = await getAudioDuration(file);
    
    // Enviar para o backend
    const response = await fetch('/api/trpc/r2.uploadSong', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "0": {
                "json": {
                    fileBase64,
                    fileName: safeFileName,
                    folderName: safeFolderName,
                    contentType: file.type || 'audio/mpeg',
                }
            }
        }),
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${error}`);
    }
    
    const data = await response.json();
    const result = data.result?.data;
    
    if (!result || !result.url) {
        throw new Error('Upload falhou: resposta inválida do servidor');
    }
    
    console.log("[R2] Upload OK! URL:", result.url);
    
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
    alert(`Erro no envio: ${error.message}`);
    throw error;
  }
};

// 3. SINCRONIZAR PASTA (RECUPERAR ARQUIVOS EXISTENTES)
export const listFilesFromR2 = async (folderName: string): Promise<Song[]> => {
    const safeFolder = sanitizeString(folderName);

    try {
        console.log(`[R2 Sync] Buscando arquivos em: ${safeFolder}`);
        
        const response = await fetch(
            `/api/trpc/r2.listFiles?input=${encodeURIComponent(JSON.stringify({ folderName: safeFolder }))}`,
            { method: 'GET' }
        );
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${error}`);
        }
        
        const data = await response.json();
        const files = data.result?.data || [];
        
        console.log(`[R2 Sync] Encontrados ${files.length} arquivos.`);

        return files.map((file: any) => {
            const fileName = file.fileName || "Desconhecido";
            const displayName = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
            
            const [artist, title] = displayName.includes('-') 
                ? displayName.split('-').map((s: string) => s.trim()) 
                : ["Desconhecido", displayName];

            return {
                id: crypto.randomUUID(),
                title: title || displayName,
                artist: artist || "Recuperado do R2",
                url: file.url,
                duration: 0,
                isJingle: false
            };
        });

    } catch (error: any) {
        console.error("[R2 Sync] Erro ao listar arquivos:", error);
        alert(`Erro ao sincronizar pasta R2: ${error.message}`);
        return [];
    }
};
