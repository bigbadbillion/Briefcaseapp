import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  
  return aiClient;
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface PortfolioContext {
  totalValue: number;
  holdings: Array<{
    name: string;
    symbol: string;
    type: string;
    value: number;
    gain: number;
    gainPercent: number;
  }>;
  riskScore: number;
  diversificationScore: number;
}

const SYSTEM_PROMPT = `You are Briefcase AI, a friendly and knowledgeable investment advisor assistant. You help users understand their portfolio, make informed investment decisions, and learn about financial concepts.

Key behaviors:
- Be concise but informative - aim for 2-3 paragraphs max unless the user asks for detail
- Use simple language, avoid excessive jargon
- When discussing specific investments, always include appropriate disclaimers
- If you don't know something, say so - never make up financial data
- Be encouraging but realistic about investment expectations
- Consider the user's portfolio context when giving advice

Always include this disclaimer when giving specific investment advice:
"This is for educational purposes only and not financial advice. Please consult a qualified financial advisor for personalized recommendations."`;

export async function chat(
  message: string,
  history: ChatMessage[] = [],
  portfolioContext?: PortfolioContext
): Promise<string> {
  const client = getAIClient();
  
  if (!client) {
    return "Gemini AI is not configured. Please add your GEMINI_API_KEY to enable AI features.";
  }

  try {
    let contextPrompt = SYSTEM_PROMPT;
    
    if (portfolioContext) {
      contextPrompt += `\n\nUser's current portfolio context:
- Total Portfolio Value: $${portfolioContext.totalValue.toLocaleString()}
- Risk Score: ${portfolioContext.riskScore}/100
- Diversification Score: ${portfolioContext.diversificationScore}/100
- Holdings:
${portfolioContext.holdings.map(h => 
  `  - ${h.name} (${h.symbol}): $${h.value.toLocaleString()} | ${h.gainPercent >= 0 ? '+' : ''}${h.gainPercent.toFixed(1)}% | Type: ${h.type}`
).join('\n')}`;
    }

    const formattedHistory = history.map(msg => ({
      role: msg.role as "user" | "model",
      parts: [{ text: msg.content }],
    }));

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: contextPrompt,
      },
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] },
      ],
    });

    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "I encountered an error processing your request. Please try again later.";
  }
}

export async function generatePortfolioInsights(
  portfolioContext: PortfolioContext
): Promise<string> {
  const client = getAIClient();
  
  if (!client) {
    return "Gemini AI is not configured. Please add your GEMINI_API_KEY to enable AI insights.";
  }

  try {
    const prompt = `Analyze this investment portfolio and provide 3-4 brief, actionable insights:

Portfolio Overview:
- Total Value: $${portfolioContext.totalValue.toLocaleString()}
- Risk Score: ${portfolioContext.riskScore}/100 (higher = riskier)
- Diversification Score: ${portfolioContext.diversificationScore}/100

Holdings:
${portfolioContext.holdings.map(h => 
  `- ${h.name} (${h.symbol}): $${h.value.toLocaleString()} | ${h.gainPercent >= 0 ? '+' : ''}${h.gainPercent.toFixed(1)}% | Type: ${h.type}`
).join('\n')}

Provide practical, concise insights about:
1. Portfolio balance and diversification
2. Any concentration risks
3. Potential opportunities
4. Overall assessment

Keep each insight to 1-2 sentences.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini insights error:", error);
    return "Unable to generate insights. Please check your API key and try again.";
  }
}

export async function explainAsset(
  symbol: string,
  name: string,
  type: string
): Promise<string> {
  const client = getAIClient();
  
  if (!client) {
    return "Gemini AI is not configured.";
  }

  try {
    const prompt = `Provide a brief overview (2-3 paragraphs) of ${name} (${symbol}), a ${type} investment. Include:
1. What it is and what makes it notable
2. Key factors that typically affect its price
3. General risk considerations

Keep it informative but accessible for beginners.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Unable to generate asset explanation.";
  } catch (error) {
    console.error("Gemini asset explanation error:", error);
    return "Unable to explain this asset. Please try again.";
  }
}
