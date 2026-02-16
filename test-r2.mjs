import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Configuração R2 (Cloudflare)
const R2_ACCOUNT_ID = "023a0bad3f17632316cd10358db2201f";
const R2_ACCESS_KEY_ID = "f24a769d6c501cc020b97ffc2de7c8ba";
const R2_SECRET_ACCESS_KEY = "5d26e3f6400a920739e881f978687ef9a4257e1b01c1cd945ad488d1be2c3159";
const R2_BUCKET_NAME = "radiotocai";
const PUBLIC_R2_DOMAIN = "https://musica.radiotocai.com";

console.log("=== TESTE DE CONEXÃO R2 ===\n");
console.log("Account ID:", R2_ACCOUNT_ID);
console.log("Bucket:", R2_BUCKET_NAME);
console.log("Endpoint:", `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
console.log("\n");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Teste 1: Criar pasta
async function testCreateFolder() {
  const folderKey = `radiotocai/TesteDebug/`;
  
  try {
    console.log(`[TESTE 1] Criando pasta: ${folderKey}`);
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: folderKey,
      Body: Buffer.from(''),
    });
    
    const result = await r2Client.send(command);
    console.log("✅ Pasta criada com sucesso!");
    console.log("Resultado:", JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Erro ao criar pasta:", error.message);
    console.error("Detalhes:", error);
    return false;
  }
}

// Teste 2: Listar objetos
async function testListObjects() {
  try {
    console.log("\n[TESTE 2] Listando objetos no bucket...");
    
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: "radiotocai/",
      MaxKeys: 10
    });
    
    const result = await r2Client.send(command);
    console.log(`✅ Encontrados ${result.Contents?.length || 0} objetos`);
    
    if (result.Contents && result.Contents.length > 0) {
      console.log("\nPrimeiros objetos:");
      result.Contents.slice(0, 5).forEach(obj => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ Erro ao listar objetos:", error.message);
    console.error("Detalhes:", error);
    return false;
  }
}

// Executar testes
(async () => {
  await testCreateFolder();
  await testListObjects();
  
  console.log("\n=== FIM DOS TESTES ===");
})();
