
import { Song } from '../types';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// --- CONFIGURAÇÃO R2 (Cloudflare) ---
const R2_ACCOUNT_ID = "023a0bad3f17632316cd10358db2201f";
const R2_ACCESS_KEY_ID = "7f83d8f5d862d11328ccc8dd050e58df";
const R2_SECRET_ACCESS_KEY = "44ee6322e4bf5351b52b3ea1fdd4bc6324f26b2fff1956a376fcc5ac58f6bac0";

// IMPORTANTE: Buckets S3/R2 geralmente são Case Sensitive ou Lowercase.
// Tente usar tudo minúsculo se estiver dando erro de 'Bucket Not Found'.
const R2_BUCKET_NAME = "radiotocai"; 

// URL Pública
const PUBLIC_R2_DOMAIN = "https://musica.radiotocai.com"; 

let r2Client: S3Client | null = null;

const getR2Client = () => {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true 
    });
  }
  return r2Client;
};

// Função auxiliar para limpar nomes
const sanitizeString = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9.\-_]/g, "_"); // Substitui espaços por _
};

// 1. CRIAR PASTA (Simulada no R2)
export const createFolderInR2 = async (folderName: string) => {
    const safeFolderName = sanitizeString(folderName);
    const key = `${safeFolderName}/`; // Termina com / para indicar pasta
    
    try {
        const client = getR2Client();
        console.log(`[R2] Criando pasta: ${key}`);
        
        await client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: new Uint8Array(0) // Arquivo vazio
        }));
        console.log(`[R2] Pasta '${folderName}' criada com sucesso.`);
        return true;
    } catch (error: any) {
        console.error("[R2] Erro ao criar pasta:", error);
        // Não lançamos erro fatal aqui para não travar a UI, apenas logamos
        return false;
    }
};

// 2. UPLOAD DE MÚSICA
export const uploadSongToR2 = async (file: File, folderName: string = "Geral"): Promise<Song> => {
  const safeFolderName = sanitizeString(folderName);
  const safeFileName = sanitizeString(file.name);
  
  // Metadados
  const displayName = file.name.replace(/\.[^/.]+$/, "");
  const [artist, title] = displayName.includes('-') 
    ? displayName.split('-').map(s => s.trim()) 
    : ["Desconhecido", displayName];
  
  // Caminho Final: Pasta/Arquivo
  // Não usamos timestamp no prefixo se quisermos nomes limpos, mas cuidado com duplicatas.
  // Vamos usar timestamp apenas se necessário, mas o usuário pediu para "gravar na pasta".
  const storageKey = `${safeFolderName}/${safeFileName}`;

  try {
    const client = getR2Client();

    // Converter para buffer seguro
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log(`[R2] Iniciando upload...`);
    console.log(`   Bucket: ${R2_BUCKET_NAME}`);
    console.log(`   Key: ${storageKey}`);
    console.log(`   Tamanho: ${uint8Array.byteLength} bytes`);
    
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
        Body: uint8Array,
        ContentType: file.type || 'audio/mpeg',
    });

    await client.send(command);
    
    const publicUrl = `${PUBLIC_R2_DOMAIN}/${storageKey}`;
    console.log("[R2] Upload OK! URL:", publicUrl);
    
    return {
        id: crypto.randomUUID(),
        title: title || displayName,
        artist: artist || "Artista Desconhecido",
        url: publicUrl,
        duration: 0,
        file: undefined
    };

  } catch (error: any) {
    console.error("[R2] Erro Fatal:", error);
    let msg = `Erro no envio: ${error.message}`;

    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network'))) {
        msg = "ERRO DE CORS/REDE: O Cloudflare bloqueou a conexão. Verifique se o bucket permite 'AllowedHeaders': ['*'] e método PUT.";
    } else if (error.$metadata?.httpStatusCode === 404) {
        msg = `ERRO 404: Bucket '${R2_BUCKET_NAME}' não existe. Verifique o nome no código (minúsculas/maiúsculas).`;
    } else if (error.$metadata?.httpStatusCode === 403) {
        msg = "ERRO 403: Acesso Negado. Suas chaves de API podem estar erradas ou sem permissão de escrita.";
    }

    alert(msg);
    throw error;
  }
};

// 3. SINCRONIZAR PASTA (RECUPERAR ARQUIVOS EXISTENTES)
export const listFilesFromR2 = async (folderName: string): Promise<Song[]> => {
    const safeFolder = sanitizeString(folderName);
    const prefix = `${safeFolder}/`;
    const client = getR2Client();

    try {
        console.log(`[R2 Sync] Buscando arquivos em: ${prefix}`);
        const command = new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: prefix
        });

        const response = await client.send(command);
        const files = response.Contents || [];
        console.log(`[R2 Sync] Encontrados ${files.length} objetos.`);

        return files
            .filter(file => file.Key && !file.Key.endsWith('/')) // Ignora a própria pasta (objetos terminados em /)
            .map(file => {
                const key = file.Key!;
                const fileName = key.split('/').pop() || "Desconhecido";
                // Formatação simples do nome para exibição (remove extensão e underlines)
                const displayName = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
                
                // Tenta extrair Artista - Titulo se o nome do arquivo tiver hifen
                const [artist, title] = displayName.includes('-') 
                    ? displayName.split('-').map(s => s.trim()) 
                    : ["Desconhecido", displayName];

                return {
                    id: crypto.randomUUID(), // Gera ID novo, já que estamos recuperando
                    title: title || displayName,
                    artist: artist || "Recuperado do R2",
                    url: `${PUBLIC_R2_DOMAIN}/${key}`,
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
