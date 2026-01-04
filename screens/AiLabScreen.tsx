
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
        text: `Hi ${user.name}! I'm here to help. What's on your mind today?` 
      }]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      api.updateChatHistory(messages);
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const contextHistory = messages.slice(-10).map(m => ({
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
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I'm sorry, I hit a snag. Let's try that again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert("Please upload an image or video.");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const typeLabel = isImage ? 'image' : 'video';
      try {
        const response = await gemini.analyzeMedia(
          base64, 
          file.type, 
          input || `Could you take a look at this ${typeLabel} and tell me what you think?`
        );
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: response,
          media: { 
            type: typeLabel as any, 
            url: reader.result as string, 
            mimeType: file.type,
            data: base64
          }
        }]);
      } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I couldn't quite analyze that. Mind trying again?" }]);
      } finally {
        setIsLoading(false);
        setInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-fadeIn">
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between bg-slate-900/50 p-3 px-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center font-bold">DR</div>
            <div>
              <span className="font-bold text-xs text-white block">Dr. Rudhh</span>
              <span className="text-[10px] flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Always here to help
              </span>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => setIsThinkingMode(!isThinkingMode)}
               className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${isThinkingMode ? 'bg-violet-600/20 text-violet-400 border-violet-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
             >
               Deep Think
             </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar pb-4 px-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
            <div className={`max-w-[90%] p-4 rounded-2xl ${
              m.role === 'user' 
                ? 'bg-violet-600 text-white rounded-br-none' 
                : 'glass-card border-slate-700/50 rounded-bl-none'
            }`}>
              {m.thinkingProcess && (
                <details className="mb-3 text-[10px] bg-slate-900/40 p-2 rounded-xl opacity-60">
                   <summary className="font-bold cursor-pointer">View my thoughts</summary>
                   <div className="mt-2 text-slate-400 whitespace-pre-wrap font-mono italic">{m.thinkingProcess}</div>
                </details>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              {m.groundingChunks && m.groundingChunks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500">I found these sources for you:</p>
                  <div className="flex flex-col gap-2">
                    {m.groundingChunks.map((chunk, i) => chunk.web && (
                      <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-2 bg-blue-400/5 p-2 rounded-xl border border-blue-400/20">
                        <span className="truncate flex-1">{chunk.web.title || "Reference link"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {m.media && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
                  {m.media.type === 'image' && <img src={m.media.url} className="w-full" />}
                  {m.media.type === 'video' && <video src={m.media.url} controls className="w-full" />}
                </div>
              )}
              {m.role === 'model' && (
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-white/5">
                  <button onClick={() => gemini.speakResponse(m.text)} className="text-[10px] font-bold text-violet-400 hover:text-violet-300">Listen</button>
                  <span className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">Sent by Dr. Rudhh</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="glass-card p-4 px-6 rounded-2xl rounded-bl-none flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Dr. Rudhh is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 bg-slate-950/40 p-2 rounded-2xl border border-slate-800">
        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl text-slate-400" title="Upload something">📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Dr. Rudhh anything..."
          className="flex-1 bg-transparent border-none p-3 text-sm focus:outline-none placeholder:text-slate-600"
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="w-10 h-10 flex items-center justify-center gradient-bg rounded-xl font-bold disabled:opacity-30">Go</button>
      </div>
    </div>
  );
};

export default AiLabScreen;
