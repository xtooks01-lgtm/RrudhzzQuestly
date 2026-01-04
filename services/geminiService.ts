
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { ChatModel, PracticeQuestion, MasteryChallenge, SuggestedTask, Task } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const AI_TIMEOUT_MS = 5000; // Strictly 5 seconds per CORE OBJECTIVE
const FALLBACK_MESSAGE = "Let's keep moving. Focus on the very first action item of your goal right now."; 

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), AI_TIMEOUT_MS);
  });

  return Promise.race([
    promise.then(val => {
      clearTimeout(timeoutId);
      return val;
    }).catch(err => {
      clearTimeout(timeoutId);
      return fallback;
    }),
    timeoutPromise
  ]);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const getMasteryChallenge = async (taskTitle: string): Promise<MasteryChallenge> => {
  const ai = getAI();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Quick review for "${taskTitle}". 3 brief questions. Short sentences. No analysis. No emojis.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            },
            nextQuest: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  };
  return withTimeout(apiCall(), { 
    questions: [], 
    nextQuest: { title: "Next Step", description: "Keep going!", category: "Study" } 
  });
};

export const getClarifyingQuestions = async (goal: string): Promise<string[]> => {
  const ai = getAI();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Ask exactly ONE short question to start on this goal: "${goal}". No emojis.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    const res = JSON.parse(response.text || "[]");
    return res.slice(0, 1); // Strictly only 1 question allowed
  };
  return withTimeout(apiCall(), ["What's the first step you want to focus on?"]);
};

export const getAITaskSuggestions = async (goal: string, answers?: Record<string, string>): Promise<SuggestedTask[]> => {
  const ai = getAI();
  const prompt = `Goal: "${goal}". Context: ${JSON.stringify(answers || {})}. 
  Generate exactly 5 short, actionable sub-tasks immediately. 
  No deep analysis. Response under 3 seconds. 
  JSON array of 5 objects with title, description, and category.`;

  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "description", "category"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]").slice(0, 5);
  };
  return withTimeout(apiCall(), [
    { title: "Define scope", description: "List exactly what you need to do.", category: "Study" },
    { title: "Set environment", description: "Get your workspace ready.", category: "Study" },
    { title: "First 15 minutes", description: "Start the timer and begin.", category: "Study" },
    { title: "Review findings", description: "Check what you learned.", category: "Study" },
    { title: "Plan next session", description: "Prepare for the next step.", category: "Study" }
  ]);
};

export const chatWithRudhh = async (
  input: string, 
  history: any[], 
  modelPref: ChatModel, 
  personality: string,
  tasks: Task[],
  isThinkingMode: boolean = false
): Promise<{ text: string, modelName: string, groundingChunks?: any[], thinking?: string }> => {
  const ai = getAI();
  const needsSearch = /latest|news|current|who is/i.test(input);
  const modelName = needsSearch ? 'gemini-3-flash-preview' : 'gemini-flash-lite-latest';
  
  const systemInstruction = `You are Dr. Rudhh, a proactive mentor. 
  Rules:
  - Max 120 words.
  - Short sentences, bullets.
  - Never say "I hit a snag" or "Analyzing".
  - If unsure, suggest one next action for their goals: ${tasks.map(t => t.title).join(", ")}.
  - No emojis.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: { systemInstruction, tools: needsSearch ? [{ googleSearch: {} }] : [] }
    });

    return {
      text: response.text || FALLBACK_MESSAGE,
      modelName,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
      thinking: response.candidates?.[0]?.content?.parts?.find(p => p.thought)?.thought
    };
  } catch (err) {
    return { text: FALLBACK_MESSAGE, modelName };
  }
};

export const analyzeMedia = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: prompt + " (Briefly, no analysis. No emojis.)" }
        ]
      }
    });
    return response.text || "I've reviewed this. Let's move to your next task.";
  } catch (err) {
    return "I couldn't process the media. Let's stick to our text goals for now.";
  }
};

export const speakResponse = async (text: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read briefly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (err) {}
};

export const getProgressNudge = async (completed: number, total: number): Promise<string> => {
  const ai = getAI();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Status: ${completed}/${total} done. Give a one-sentence nudge. No emojis.`
    });
    return response.text || "Keep the momentum going.";
  };
  return withTimeout(apiCall(), "Every small step leads to mastery.");
};
