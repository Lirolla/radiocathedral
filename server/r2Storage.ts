import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Configuração R2 (Cloudflare)
const R2_ACCOUNT_ID = "023a0bad3f17632316cd10358db2201f";
const R2_ACCESS_KEY_ID = "f24a769d6c501cc020b97ffc2de7c8ba";
const R2_SECRET_ACCESS_KEY = "5d26e3f6400a920739e881f978687ef9a4257e1b01c1cd945ad488d1be2c3159";
const R2_BUCKET_NAME = "radiotocai";
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
    });
  }
  return r2Client;
};

// Função auxiliar para limpar nomes
const sanitizeString = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9.\-_]/g, "_"); // Substitui caracteres especiais por _
};

// Upload de música para R2
export const uploadSongToR2 = async (
  fileBuffer: Buffer,
  fileName: string,
  folderName: string,
  contentType: string
): Promise<{ url: string; key: string }> => {
  const safeFolderName = sanitizeString(folderName);
  const safeFileName = sanitizeString(fileName);
  
  // Caminho completo (raiz do bucket)
  const storageKey = `${safeFolderName}/${safeFileName}`;

  try {
    const client = getR2Client();

    console.log(`[R2 Backend] Iniciando upload...`);
    console.log(`   Bucket: ${R2_BUCKET_NAME}`);
    console.log(`   Key: ${storageKey}`);
    console.log(`   Tamanho: ${fileBuffer.byteLength} bytes`);
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: contentType || 'audio/mpeg',
      CacheControl: 'public, max-age=31536000',
    });

    await client.send(command);
    
    const publicUrl = `${PUBLIC_R2_DOMAIN}/${storageKey}`;
    console.log("[R2 Backend] Upload OK! URL:", publicUrl);
    
    return {
      url: publicUrl,
      key: storageKey
    };

  } catch (error: any) {
    console.error("[R2 Backend] Erro Fatal:", error);
    throw new Error(`Erro no upload R2: ${error.message}`);
  }
};

// Criar pasta (simulada) no R2
export const createFolderInR2 = async (folderName: string): Promise<boolean> => {
  const safeFolderName = sanitizeString(folderName);
  const key = `${safeFolderName}/`;
  
  try {
    const client = getR2Client();
    console.log(`[R2 Backend] Criando pasta: ${key}`);
    
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(''),
    }));
    
    console.log(`[R2 Backend] Pasta '${folderName}' criada com sucesso.`);
    return true;
  } catch (error: any) {
    console.error("[R2 Backend] Erro ao criar pasta:", error);
    return false;
  }
};

// Listar arquivos de uma pasta
export const listFilesFromR2 = async (folderName: string): Promise<any[]> => {
  const safeFolder = sanitizeString(folderName);
  const prefix = `${safeFolder}/`;
  const client = getR2Client();

  try {
    console.log(`[R2 Backend] Buscando arquivos em: ${prefix}`);
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix
    });

    const response = await client.send(command);
    const files = response.Contents || [];
    console.log(`[R2 Backend] Encontrados ${files.length} objetos.`);

    return files
      .filter(file => file.Key && !file.Key.endsWith('/'))
      .map(file => {
        const key = file.Key!;
        const fileName = key.split('/').pop() || "Desconhecido";
        const displayName = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        
        const [artist, title] = displayName.includes('-') 
          ? displayName.split('-').map(s => s.trim()) 
          : ["Desconhecido", displayName];

        return {
          title: title || displayName,
          artist: artist || "Recuperado do R2",
          url: `${PUBLIC_R2_DOMAIN}/${key}`,
          key: key
        };
      });

  } catch (error: any) {
    console.error("[R2 Backend] Erro ao listar arquivos:", error);
    throw new Error(`Erro ao listar arquivos R2: ${error.message}`);
  }
};
