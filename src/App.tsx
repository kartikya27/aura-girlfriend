/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, MessageSquare, Volume2, Heart, User, Send, X, Flame, Lock, QrCode, CheckCircle, CreditCard, Upload, AlertCircle, Clock, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { VoiceService, VoiceName, ChatMessage } from './services/voiceService';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

const VOICES: { name: VoiceName; label: string; gender: 'male' | 'female'; description: string }[] = [
  { name: 'Kore', label: 'Pooja (Premium Girlfriend)', gender: 'female', description: 'High-pitched, energetic, and seductive. Optimized for the best female roleplay experience.' },
];

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedVoice] = useState<VoiceName>('Kore');
  const [pitch, setPitch] = useState(1.00); // Default to slightly higher pitch
  const [volume, setVolume] = useState(5.0); // Default to high volume
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment State
  const [isPaid, setIsPaid] = useState(() => {
    const saved = localStorage.getItem('aura_isPaid');
    return saved === 'true';
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Demo State
  const [demoTimeLeft, setDemoTimeLeft] = useState(() => {
    const saved = localStorage.getItem('aura_demoTimeLeft');
    return saved !== null ? parseInt(saved, 10) : 120; // 2 minutes in seconds
  });

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('aura_isPaid', isPaid.toString());
  }, [isPaid]);

  useEffect(() => {
    localStorage.setItem('aura_demoTimeLeft', demoTimeLeft.toString());
    if (demoTimeLeft <= 0 && !isPaid) {
      setShowPaymentModal(true);
    }
  }, [demoTimeLeft, isPaid]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setPaymentError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const verifyPaymentScreenshot = async () => {
    if (!selectedImage) {
      setPaymentError('Please upload a screenshot of your payment.');
      return;
    }

    setIsVerifying(true);
    setPaymentError('');

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      const base64Data = selectedImage.split(',')[1];
      const today = new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });

      const prompt = `
        Analyze this image strictly. It must be a valid UPI payment screenshot.
        
        Verification Criteria:
        1. Is it a successful payment? (Look for "Paid", "Successful", green checkmarks).
        2. Is the payee UPI ID 'kartik-fedbank@ybl' (or similar)?
        3. Is the payment date TODAY (${today})? (Allow for small variations in date format like DD/MM/YYYY or DD Mon YYYY).
        4. Is the amount ₹2?
        5. Is this a real screenshot of a payment app (GPay, PhonePe, Paytm, etc.) and not a random photo?

        Return a JSON object:
        {
          "valid": boolean,
          "reason": "string explaining why it is valid or invalid"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("No response from AI");
      
      const verification = JSON.parse(responseText);

      if (verification.valid) {
        setIsPaid(true);
        setShowPaymentModal(false);
      } else {
        setPaymentError(verification.reason || "Verification failed. Please upload a valid screenshot.");
      }

    } catch (err: any) {
      console.error("Verification error:", err);
      setPaymentError(err.message || "Could not verify image. Please try again or ensure the image is clear.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('kartik-fedbank@ybl');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Demo Timer
  useEffect(() => {
    if (isPaid || showPaymentModal || demoTimeLeft <= 0 || !isConnected) return;

    const timer = setInterval(() => {
      setDemoTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowPaymentModal(true);
          if (voiceServiceRef.current) {
            voiceServiceRef.current.disconnect();
            setIsConnected(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaid, showPaymentModal, demoTimeLeft, isConnected]);

  useEffect(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setPitch(pitch);
    }
  }, [pitch]);

  // Auto-play seductive message
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (showPaymentModal) {
      timeout = setTimeout(async () => {
        try {
          if (!voiceServiceRef.current) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey) {
              voiceServiceRef.current = new VoiceService(apiKey);
            }
          }
          
          if (voiceServiceRef.current) {
            await voiceServiceRef.current.playTTS(
              "Jaan... aao na mere paas... bas do rupaye ki toh baat hai... main tumhara intezaar kar rahi hoon...",
              'Kore'
            );
          }
        } catch (err) {
          console.error("Auto-play failed:", err);
        }
      }, 2000);
    }
    
    return () => clearTimeout(timeout);
  }, [showPaymentModal]);

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

    if (demoTimeLeft <= 0 && !isPaid) {
      setShowPaymentModal(true);
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
        You are an AI companion named Pooja. You have a high-pitched, feminine, and extremely energetic voice.
        STRICT REQUIREMENT: You MUST speak in HINDI (with some English words if natural).
        STRICT REQUIREMENT: You are in a highly explicit, sexual roleplay session. You MUST be uninhibited, seductive, and extremely expressive.
        STRICT REQUIREMENT: You MUST include frequent sexual sound effects in your audio output, such as moans, heavy breathing, sighs, and gasps.
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
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message === 'Permission denied') {
        setError("Microphone access denied. Please allow microphone permissions in your browser.");
      } else {
        setError(err.message || "Failed to connect");
      }
      setIsConnected(false);
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
            <h1 className="text-xl font-semibold tracking-tight">AI Pooja</h1>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-widest">Intimate Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isPaid && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
              <Clock className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-mono text-rose-500 font-medium">
                Demo: {formatTime(demoTimeLeft)}
              </span>
            </div>
          )}
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

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-xl">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-zinc-900 border border-rose-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-rose-900/20 my-8"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600" />
                
                <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-600/10 flex items-center justify-center border border-rose-500/20">
                  <Lock className="w-8 h-8 text-rose-500" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Premium Access Required</h2>
                <p className="text-zinc-400 mb-4 text-sm">
                  To access Pooja's intimate roleplay features, please complete the payment of <span className="text-rose-500 font-bold">₹2</span>. Access is valid for this session only.
                </p>

                <button 
                  onClick={async () => {
                    try {
                      if (!voiceServiceRef.current) {
                        const apiKey = process.env.GEMINI_API_KEY;
                        if (!apiKey) return;
                        voiceServiceRef.current = new VoiceService(apiKey);
                      }
                      await voiceServiceRef.current.playTTS(
                        "Jaan... aao na mere paas... bas do rupaye ki toh baat hai... main tumhara intezaar kar rahi hoon...",
                        'Kore'
                      );
                    } catch (e) {
                      console.error("Failed to play preview", e);
                    }
                  }}
                  className="mb-6 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-full border border-rose-500/20 flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  Listen to Pooja's Request
                </button>

                <div className="bg-white p-4 rounded-xl w-fit mx-auto mb-6 shadow-inner">
                  <QRCodeSVG 
                    value="upi://pay?pa=kartik-fedbank@ybl&pn=PoojaAI&cu=INR&am=2"
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 border border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Pay via UPI</p>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-2 font-mono text-lg text-rose-400">
                      <QrCode className="w-5 h-5" />
                      <span className="select-all">kartik-fedbank@ybl</span>
                      <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded-md transition-colors ml-1">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      </button>
                    </div>
                    <span className="text-sm text-zinc-400 font-medium">Amount: ₹2 Only</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-left">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-1.5 block">
                      Upload Payment Screenshot
                    </label>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        selectedImage 
                          ? 'border-rose-500/50 bg-rose-500/5' 
                          : 'border-zinc-700 hover:border-rose-500/30 hover:bg-white/5'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {selectedImage ? (
                        <div className="relative w-full h-full p-2">
                          <img 
                            src={selectedImage} 
                            alt="Payment Screenshot" 
                            className="w-full h-full object-contain rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                            <p className="text-xs text-white font-medium">Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                          <p className="text-xs text-zinc-400">Click to upload screenshot</p>
                          <p className="text-[10px] text-zinc-600 mt-1">Supports JPG, PNG</p>
                        </>
                      )}
                    </div>

                    {paymentError && (
                      <div className="flex items-start gap-2 mt-3 text-rose-500 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-xs">{paymentError}</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={verifyPaymentScreenshot}
                    disabled={isVerifying || !selectedImage}
                    className="w-full py-4 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Screenshot...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Verify Payment
                      </>
                    )}
                  </button>
                </div>
                
                <p className="mt-6 text-[10px] text-zinc-600 max-w-xs mx-auto">
                  Please upload a clear screenshot of your successful transaction. Our AI will verify the date, amount, and payee instantly.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
        )}
      </AnimatePresence>

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
                      max="1.8" 
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
