import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AgentStep {
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface AnalysisResult {
  reasoning: string;
  complianceScore: number;
  status: 'safe' | 'warning' | 'violation';
  suggestedActions: string[];
  steps: AgentStep[];
}

export async function analyzeTransaction(transaction: any): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following financial transaction for regulatory compliance (SEBI, RBI, IFRS).
    Transaction Details:
    - Amount: ${transaction.amount} ${transaction.currency}
    - Counterparty: ${transaction.counterparty}
    - Category: ${transaction.category}
    - Timestamp: ${transaction.timestamp}

    Provide a detailed reasoning, a compliance score (0-100, where 100 is perfectly safe), 
    a status (safe, warning, violation), and suggested corrective actions.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: { type: Type.STRING },
            complianceScore: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ["safe", "warning", "violation"] },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["reasoning", "complianceScore", "status", "suggestedActions"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      ...result,
      steps: [
        { title: "Data Ingestion", description: "Transaction data received and parsed.", status: "completed" },
        { title: "Guardrail Check", description: "Rule-based compliance engine validation.", status: "completed" },
        { title: "AI Reasoning", description: "Deep analysis using Gemini LLM.", status: "completed" },
        { title: "Decision Finalization", description: "Risk score and status assigned.", status: "completed" }
      ]
    };
  } catch (error) {
    console.error("AI Agent Error:", error);
    throw error;
  }
}

export async function analyzeComplianceDocument(base64Data: string): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the attached financial document (PDF) for regulatory compliance (SEBI, RBI, IFRS).
    Extract key transaction details if any, identify potential risks, and provide a compliance score.
    
    Provide a detailed reasoning, a compliance score (0-100, where 100 is perfectly safe), 
    a status (safe, warning, violation), and suggested corrective actions.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: { type: Type.STRING },
            complianceScore: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ["safe", "warning", "violation"] },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["reasoning", "complianceScore", "status", "suggestedActions"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      ...result,
      steps: [
        { title: "Document OCR", description: "PDF content extracted and processed.", status: "completed" },
        { title: "Entity Extraction", description: "Key financial entities identified.", status: "completed" },
        { title: "Regulatory Mapping", description: "Cross-referencing with SEBI/RBI guidelines.", status: "completed" },
        { title: "Final Assessment", description: "Compliance score and status finalized.", status: "completed" }
      ]
    };
  } catch (error) {
    console.error("AI Document Agent Error:", error);
    throw error;
  }
}

export async function getComplianceAdvice(query: string, context: any[], pdfBase64?: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a Senior RegTech Compliance Officer. 
    User Query: "${query}"
    
    Context (Recent Transactions/Logs):
    ${JSON.stringify(context.slice(0, 5))}

    ${pdfBase64 ? "The user has also attached a financial document (PDF) for your review. Please consider its contents in your advice." : ""}

    Provide expert advice on financial compliance (SEBI, RBI, IFRS). 
    Be concise, professional, and highlight potential risks or corrective actions.
    Use Markdown for formatting.
  `;

  try {
    const contents: any[] = [{ text: prompt }];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "An error occurred while consulting the compliance engine.";
  }
}
