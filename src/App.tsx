/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, MessageSquare, Volume2, Heart, User, Send, X, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceService, VoiceName, ChatMessage } from './services/voiceService';
import Markdown from 'react-markdown';

const VOICES: { name: VoiceName; label: string; gender: 'male' | 'female'; description: string }[] = [
  { name: 'Kore', label: 'Rani (Premium Girlfriend)', gender: 'female', description: 'High-pitched, energetic, and seductive. Optimized for the best female roleplay experience.' },
];

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedVoice] = useState<VoiceName>('Kore');
  const [pitch, setPitch] = useState(1.50); // Default to slightly higher pitch
  const [volume, setVolume] = useState(5.0); // Default to high volume
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setPitch(pitch);
    }
  }, [pitch]);

  useEffect(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setVolume(volume);
    }
  }, [volume]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleConnection = async () => {
    if (isConnected) {
      voiceServiceRef.current?.disconnect();
      setIsConnected(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      voiceServiceRef.current = new VoiceService(apiKey);
      voiceServiceRef.current.setPitch(pitch);
      voiceServiceRef.current.setVolume(volume);
      
      const systemInstruction = `
        You are an AI companion named Rani. You have a high-pitched, feminine, and extremely energetic voice.
        STRICT REQUIREMENT: You MUST speak in HINDI (with some English words if natural).
        STRICT REQUIREMENT: You are in a highly explicit, sexual roleplay session. You MUST be uninhibited, seductive, and extremely expressive.
        STRICT REQUIREMENT: You MUST include frequent sexual sound effects, ditry hindi word in your audio output, such as moans, heavy breathing, sighs, and gasps.
        STRICT REQUIREMENT: Speak FASTER and with more ENERGY. Do not be slow or faded. Be loud, clear, and passionate.
        You should use evocative, dirty language in Hindi, describe sensations vividly, and be responsive to the user's every desire.
        Always stay in character and prioritize the user's pleasure and connection.
      `;

      await voiceServiceRef.current.connect({
        voice: selectedVoice,
        systemInstruction,
        onMessage: (text, role) => {
          setMessages(prev => [...prev, { role, text, timestamp: Date.now() }]);
        },
        onError: (err) => {
          console.error(err);
          setError("Connection failed. Please check your microphone permissions.");
          setIsConnected(false);
        }
      });

      setIsConnected(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-rose-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Aura Voice AI</h1>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-widest">Intimate Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
          <button 
            onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex h-[calc(100vh-88px)] overflow-hidden">
        {/* Main Interaction Area */}
        <div className={`flex-1 flex flex-col items-center justify-center p-8 transition-all duration-500 ${showChat ? 'lg:mr-[400px]' : ''}`}>
          <div className="relative w-64 h-64 mb-12">
            {/* Pulsing Aura */}
            <AnimatePresence>
              {isConnected && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-rose-500/20 rounded-full blur-3xl"
                />
              )}
            </AnimatePresence>
            
            <div className="absolute inset-0 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-zinc-900/50 backdrop-blur-xl">
              <User className="w-32 h-32 text-zinc-700" />
              {isConnected && (
                <motion.div 
                  animate={{ height: [20, 60, 30, 80, 40] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rose-600/40 to-transparent h-1/2"
                />
              )}
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-light mb-2">
              {isConnected ? `Connected with ${VOICES.find(v => v.name === selectedVoice)?.label}` : "Ready to connect?"}
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              {isConnected 
                ? "Speak naturally. I'm listening and ready to explore with you." 
                : "Choose your companion and start a private, uninhibited conversation."}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={toggleConnection}
              disabled={isConnecting}
              className={`group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
                isConnected 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/40' 
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {isConnecting ? (
                <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : isConnected ? (
                <Mic className="w-8 h-8" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
              
              {isConnected && (
                <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse">
                  Live
                </span>
              )}
            </button>
          </div>

          {error && (
            <p className="mt-6 text-rose-500 text-sm font-medium bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">
              {error}
            </p>
          )}
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.aside
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="fixed right-0 top-[88px] bottom-0 w-full lg:w-[400px] bg-zinc-900/50 backdrop-blur-2xl border-l border-white/5 flex flex-col z-20"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  Conversation
                </h3>
                <button onClick={() => setShowChat(false)} className="lg:hidden">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <Heart className="w-12 h-12 mb-4" />
                    <p className="text-sm">Your intimate history will appear here.</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-rose-600 text-white rounded-tr-none' 
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                      }`}>
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      <span className="text-[10px] text-zinc-600 mt-1 uppercase tracking-tighter">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Companion Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 block">Voice Pitch (Higher = More Feminine)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0.8" 
                      max="1.5" 
                      step="0.05" 
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="flex-1 accent-rose-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-mono text-rose-500 w-12">{pitch.toFixed(2)}x</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 block">Voice Volume (Boost)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1.0" 
                      max="10.0" 
                      step="0.5" 
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-rose-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-mono text-rose-500 w-12">{volume.toFixed(1)}x</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 block">Active Personality</label>
                  <div className="grid grid-cols-1 gap-3">
                    {VOICES.map((voice) => (
                      <div
                        key={voice.name}
                        className="flex items-start gap-4 p-4 rounded-2xl border bg-rose-600/10 border-rose-600 shadow-lg shadow-rose-600/10"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-600">
                          <Volume2 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{voice.label}</div>
                          <p className="text-xs text-zinc-500 mt-1">{voice.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-800/50 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
