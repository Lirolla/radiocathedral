import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa o cliente GenAI de forma preguiçosa (Lazy Initialization)
// Isso evita que o construtor rode no momento da importação, o que pode causar erros de 'fs' em alguns ambientes.
let ai: GoogleGenerativeAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // ATENÇÃO: Em produção, isso deve ser chamado via backend para não expor a chave.
    // O environment automaticamente injeta a chave neste ambiente simulado.
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY não configurada. Funcionalidades de IA não estarão disponíveis.");
      return null;
    }
    ai = new GoogleGenerativeAI(apiKey);
  }
  return ai;
};

export const generateDJIntro = async (songTitle: string, artistName: string): Promise<string> => {
  try {
    const client = getAiClient();
    if (!client) {
      return `Agora tocando ${songTitle} de ${artistName}!`;
    }

    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
      Você é um locutor de rádio (DJ) energético e carismático de uma rádio moderna chamada "CloudWave Radio".
      
      A próxima música é "${songTitle}" do artista "${artistName}".
      
      Escreva uma introdução muito curta (máximo 2 frases) e empolgante em Português para anunciar esta música. 
      Não use aspas na resposta. Seja direto e radical.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text()?.trim() || `Agora tocando ${songTitle} de ${artistName}!`;
  } catch (error) {
    console.error("Erro ao gerar intro DJ:", error);
    return `Aumente o som! Agora vem ${songTitle}.`;
  }
};
