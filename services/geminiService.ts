
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { ChatModel, PracticeQuestion, MasteryChallenge, SuggestedTask, Task } from "../types";

// Always create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date key.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const AI_TIMEOUT_MS = 5000; // CORE OBJECTIVE: Max 5s
const FALLBACK_MESSAGE = "I couldn't process that fully. Try focusing on the very first step of your goal right now."; 

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), AI_TIMEOUT_MS);
  });

  return Promise.race([
    promise.then(val => {
      clearTimeout(timeoutId);
      return val;
    }).catch(() => {
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
      contents: `Generate 3 quick review questions for "${taskTitle}". Bullet points. No emojis. No analysis.`,
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
    nextQuest: { title: "Daily Focus", description: "Stay consistent with your routine.", category: "Study" } 
  });
};

export const getClarifyingQuestions = async (goal: string): Promise<string[]> => {
  const ai = getAI();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Ask exactly ONE short clarifying question for the goal: "${goal}". No emojis.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    const res = JSON.parse(response.text || "[]");
    return res.slice(0, 1); // Strictly one question
  };
  return withTimeout(apiCall(), ["What is the specific outcome you want to see?"]);
};

export const getAITaskSuggestions = async (goal: string, answers?: Record<string, string>): Promise<SuggestedTask[]> => {
  const ai = getAI();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Goal: "${goal}". Context: ${JSON.stringify(answers || {})}. Generate EXACTLY 5 short actionable sub-tasks. No analysis. JSON array only.`,
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
    { title: "Define first step", description: "Identify one small action.", category: "Study" },
    { title: "Remove distractions", description: "Clear your workspace.", category: "Study" },
    { title: "Start 10min timer", description: "Begin working now.", category: "Study" },
    { title: "Note progress", description: "Write down what you did.", category: "Study" },
    { title: "Plan tomorrow", description: "Set the next goal.", category: "Study" }
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
  const needsSearch = /latest|news|current|who is|weather/i.test(input);
  
  // Select appropriate model based on task complexity and search needs.
  let modelName = 'gemini-flash-lite-latest';
  if (needsSearch) {
    modelName = 'gemini-3-flash-preview';
  } else if (isThinkingMode) {
    modelName = 'gemini-3-pro-preview';
  }
  
  const systemInstruction = `You are Dr. Rudhh, a mentor. 
  Your personality is: ${personality}.
  Max 120 words. No repetition. Bullet points for lists. 
  NEVER say "I hit a snag" or "Analyzing". 
  If an error occurs, suggest focusing on: ${tasks.length ? tasks[0].title : 'a new quest'}. 
  No emojis.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config: { 
        systemInstruction, 
        tools: needsSearch ? [{ googleSearch: {} }] : [],
        // If thinking mode is active, set thinking budget for supported models.
        ...(isThinkingMode && modelName === 'gemini-3-pro-preview' ? { thinkingConfig: { thinkingBudget: 16000 } } : {})
      }
    });

    return {
      text: response.text || FALLBACK_MESSAGE,
      modelName,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
      // Extract thinking process if present in the response parts.
      thinking: response.candidates?.[0]?.content?.parts?.find(p => p.thought)?.thought
    };
  } catch {
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
          { text: prompt + " (Brief reply only. No emojis.)" }
        ]
      }
    });
    return response.text || "Reviewed. Let's continue your mission.";
  } catch {
    return "Media processing skipped. Focus on your text quests.";
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
  } catch {}
};

export const getProgressNudge = async (completed: number, total: number): Promise<string> => {
  const ai = getAI();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Progress: ${completed}/${total}. One short sentence nudge. No emojis.`
    });
    return response.text || "Every action gets you closer to mastery.";
  };
  return withTimeout(apiCall(), "Focus on your next victory.");
};
