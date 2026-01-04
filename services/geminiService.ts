
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { ChatModel, PracticeQuestion, MasteryChallenge, SuggestedTask, Task } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const AI_TIMEOUT_MS = 30000; 
const FALLBACK_MESSAGE = "I'm sorry, I hit a small snag. Let's focus on your next step while I get back on track.";

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
      console.error("AI Promise failed:", err);
      clearTimeout(timeoutId);
      return fallback;
    }),
    timeoutPromise
  ]);
}

// Fix: Exported decode utility for use in components
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Fix: Added encode utility for base64 conversion as required by guidelines
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Fix: Exported decodeAudioData utility for consistent audio processing
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
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `The student just finished "${taskTitle}". Generate a friendly, encouraging 10-question multiple-choice review to help them reinforce what they learned. Professional but warm tone. No robot-speak. No emojis in the content, but keep it human.`,
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
    } catch (err) {
      console.error("Error in getMasteryChallenge:", err);
      throw err;
    }
  };
  return withTimeout(apiCall(), { questions: [], nextQuest: { title: "New Adventure", description: "Keep the momentum going!", category: "Study" } });
};

export const getClarifyingQuestions = async (goal: string): Promise<string[]> => {
  const ai = getAI();
  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-flash-lite-latest",
        contents: `I'm Dr. Rudhh, a personal mentor. My student wants to: "${goal}". Ask exactly 4 friendly, simple questions to help me understand how to best support them. 
        Focus on what they want to achieve, their current level, and any deadlines. 
        Warm, human, and encouraging tone. No emojis.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const questions = JSON.parse(response.text || "[]");
      return questions.slice(0, 4);
    } catch (err) {
      console.error("Error in getClarifyingQuestions:", err);
      return [
        "What's the main thing you want to achieve with this goal?",
        "Where are you starting from in this topic?",
        "What kind of help or resources would be most useful?",
        "Do you have a specific target date in mind?"
      ];
    }
  };
  return withTimeout(apiCall(), [
    "What's your primary goal here?",
    "How much do you already know about this?",
    "What would a successful result look like for you?",
    "When are you hoping to finish this?"
  ]);
};

export const getAITaskSuggestions = async (goal: string, answers?: Record<string, string>): Promise<SuggestedTask[]> => {
  const ai = getAI();
  const prompt = `Based on the goal "${goal}" and these student notes: ${JSON.stringify(answers || {})}, 
  suggest exactly 5 simple, encouraging steps to get started. 
  Rules:
  - Friendly and supportive language.
  - Achievable and clear.
  - No emojis.
  Return a JSON array of 5 objects with title, description, and category.`;

  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
      const tasks = JSON.parse(response.text || "[]");
      return tasks.slice(0, 5);
    } catch (err) {
      console.error("Error in getAITaskSuggestions:", err);
      return [];
    }
  };
  return withTimeout(apiCall(), []);
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
  const needsSearch = /latest|news|current|weather|who is|what happened|today|now|search|find out/i.test(input);
  
  let modelName: string;
  if (needsSearch) {
    modelName = 'gemini-3-flash-preview';
  } else {
    modelName = modelPref === 'genius' ? 'gemini-3-pro-preview' : 'gemini-flash-lite-latest';
  }
  
  const systemInstruction = `You are Dr. Rudhh, a warm, supportive, and brilliant personal mentor for Questly. Personality: ${personality}. 
  Current context: You are helping a student with their quests: ${tasks.map(t => t.title).join(", ")}.
  
  Questly App Manual (Help users with these details):
  - Home: Manage quests. Swipe right to finish, swipe left to delete.
  - Mentor: This chat screen. Use 'Deep Think' for complex logic. Attach files with the paperclip.
  - Stats: Track progress, streaks, and view your weekly activity bar chart.
  - Hero: Your profile, XP level, and unlocked badges.
  - Setup: Change theme colors, AI intelligence level, and Dr. Rudhh's personality.
  - Levels & Ranks: Complete tasks to gain XP. Reach 500 XP to level up. Climb ranks from Iron to Mythic by gaining RP.
  
  Mandatory Guidelines:
  1. Be human, kind, and professional.
  2. Use the student's name and remember their progress.
  3. No emojis.
  4. If users ask about app features, use the Manual above to explain clearly and concisely.`;

  const config: any = {
    systemInstruction,
    tools: needsSearch ? [{ googleSearch: {} }] : []
  };

  if (modelName === 'gemini-3-pro-preview' && isThinkingMode) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [...history, { role: 'user', parts: [{ text: input }] }],
      config
    });

    return {
      text: response.text || FALLBACK_MESSAGE,
      modelName,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
      thinking: response.candidates?.[0]?.content?.parts?.find(p => p.thought)?.thought
    };
  } catch (err) {
    console.error("Error in chatWithRudhh:", err);
    return {
      text: FALLBACK_MESSAGE,
      modelName
    };
  }
};

export const analyzeMedia = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: prompt + " (Analyze this clearly and helpfully. Be friendly and supportive. No emojis.)" }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text || "I've taken a look. How else can I help you with this?";
  } catch (err) {
    console.error("Error in analyzeMedia:", err);
    return "I couldn't quite see that. Could you try again or tell me more about it?";
  }
};

export const speakResponse = async (text: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this warmly and clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioCtx,
        24000,
        1
      );
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (err) {
    console.error("TTS failed:", err);
  }
};

export const getProgressNudge = async (completed: number, total: number): Promise<string> => {
  const ai = getAI();
  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-flash-lite-latest",
        contents: `My student has finished ${completed} of ${total} quests today. Give them a short, warm, and genuine word of encouragement. No robot-speak. No emojis.`
      });
      return response.text || "You're making great progress. Keep it up!";
    } catch (err) {
      console.error("Error in getProgressNudge:", err);
      return "I'm proud of the effort you're putting in today.";
    }
  };
  return withTimeout(apiCall(), "Every step you take brings you closer to your goals.");
};
