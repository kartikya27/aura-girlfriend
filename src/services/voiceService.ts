import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export class VoiceService {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextStartTime = 0;
  private pitch = 1.0;
  private volume = 4.0;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  setPitch(value: number) {
    this.pitch = value;
  }

  setVolume(value: number) {
    this.volume = value;
  }

  async playTTS(text: string, voice: VoiceName) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Decode and play immediately
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const floatData = new Float32Array(bytes.length / 2);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < floatData.length; i++) {
          floatData[i] = view.getInt16(i * 2, true) / 0x7FFF;
        }

        const buffer = this.audioContext.createBuffer(1, floatData.length, 24000);
        buffer.getChannelData(0).set(floatData);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      }
    } catch (error) {
      console.error("TTS Error:", error);
    }
  }

  async connect(config: {
    voice: VoiceName;
    systemInstruction: string;
    onMessage: (msg: string, role: 'user' | 'model') => void;
    onError: (err: any) => void;
  }) {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(stream);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.session = await this.ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } },
          },
          systemInstruction: config.systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            this.source?.connect(this.processor!);
            this.processor?.connect(this.audioContext!.destination);
            
            this.processor!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              this.session?.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  this.handleAudioOutput(part.inlineData.data);
                }
                if (part.text) {
                  config.onMessage(part.text, 'model');
                }
              }
            }
            
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
            }
          },
          onerror: (err) => config.onError(err),
          onclose: () => console.log("Live session closed"),
        },
      });
    } catch (err) {
      config.onError(err);
      throw err;
    }
  }

  private handleAudioOutput(base64Data: string) {
    if (!this.audioContext) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcmData = new Int16Array(bytes.buffer);
    
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    // Live API output is 24000Hz
    const buffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.pitch;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = this.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Schedule immediately, adding a small buffer if we're falling behind
    if (this.nextStartTime < this.audioContext.currentTime) {
      this.nextStartTime = this.audioContext.currentTime + 0.05;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration / this.pitch;
  }

  private stopPlayback() {
    this.nextStartTime = 0;
  }

  disconnect() {
    this.session?.close();
    this.processor?.disconnect();
    this.source?.disconnect();
    this.audioContext?.close();
  }
}
