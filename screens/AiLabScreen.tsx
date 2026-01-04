
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile, Task } from '../types';
import * as gemini from '../services/geminiService';
import { api } from '../services/mockApi';

interface AiLabScreenProps {
  user: UserProfile;
  tasks: Task[];
}

const AiLabScreen: React.FC<AiLabScreenProps> = ({ user, tasks }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = api.getData();
    if (data.chatHistory && data.chatHistory.length > 0) {
      setMessages(data.chatHistory);
    } else {
      setMessages([{ 
        id: '1', 
        role: 'model', 
        text: `Hi ${user.name}! I'm Dr. Rudhh. How can I help you progress right now?` 
      }]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      api.updateChatHistory(messages);
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const contextHistory = messages.slice(-3).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await gemini.chatWithRudhh(
        input, 
        contextHistory, 
        user.settings.modelPreference,
        user.settings.rudhhPersonality,
        tasks,
        isThinkingMode
      );
      
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text,
        modelUsed: response.modelName,
        groundingChunks: response.groundingChunks,
        thinkingProcess: response.thinking
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I couldn't process that. Try focusing on your current focus quest."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const response = await gemini.analyzeMedia(base64, file.type, "Analyze this briefly.");
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: response,
          media: { type: file.type.startsWith('image/') ? 'image' : 'video', url: reader.result as string, mimeType: file.type }
        }]);
      } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I can't see that clearly. Let's keep moving with our tasks." }]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-fadeIn">
      <div className="flex items-center justify-between bg-slate-900/50 p-3 px-4 rounded-2xl border border-slate-800 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center font-bold">DR</div>
          <span className="font-bold text-xs text-white">Dr. Rudhh</span>
        </div>
        <button 
          onClick={() => setIsThinkingMode(!isThinkingMode)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${isThinkingMode ? 'bg-violet-600/20 text-violet-400 border-violet-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
        >
          {isThinkingMode ? 'Logic Max' : 'Fast Mode'}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar px-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-violet-600 text-white rounded-br-none' : 'glass-card border-slate-700/50 rounded-bl-none'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              {m.media && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
                  {m.media.type === 'image' ? <img src={m.media.url} className="w-full" /> : <video src={m.media.url} controls className="w-full" />}
                </div>
              )}
              {m.role === 'model' && (
                <button onClick={() => gemini.speakResponse(m.text)} className="mt-3 text-[10px] font-bold text-violet-400 block uppercase tracking-widest">Listen</button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass-card p-3 px-5 rounded-2xl text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
              Replying...
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 bg-slate-950/40 p-2 rounded-2xl border border-slate-800">
        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl text-slate-400">📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="What's next?"
          className="flex-1 bg-transparent border-none p-3 text-sm focus:outline-none"
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="w-10 h-10 flex items-center justify-center gradient-bg rounded-xl font-bold disabled:opacity-30">➜</button>
      </div>
    </div>
  );
};

export default AiLabScreen;
