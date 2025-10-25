import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveSession, LiveServerMessage } from '@google/genai';
import Card from './common/Card';
import Button from './common/Button';
import { encode, decode, decodeAudioData } from '../utils/helpers';
import type { Blob } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const LiveAssistant: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [transcripts, setTranscripts] = useState<string[]>([]);
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    setStatus('idle');
  }, []);

  const startConversation = async () => {
    setStatus('connecting');
    setTranscripts([]);
    
    try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // FIX: Add type casting to handle vendor-prefixed webkitAudioContext for older browsers.
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // FIX: Add type casting to handle vendor-prefixed webkitAudioContext for older browsers.
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        let nextStartTime = 0;

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: 'Vous êtes un assistant d\'achat amical et serviable. Gardez vos réponses courtes et conversationnelles.'
            },
            callbacks: {
                onopen: () => {
                    setStatus('connected');
                    if (!streamRef.current || !inputAudioContextRef.current) return;
                    
                    mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                    scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => {
                          session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                    }

                    if (message.serverContent?.turnComplete) {
                        const userTurn = `Vous : ${currentInputTranscriptionRef.current}`;
                        const modelTurn = `Assistant : ${currentOutputTranscriptionRef.current}`;
                        setTranscripts(prev => [...prev, userTurn, modelTurn]);
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData && outputAudioContextRef.current) {
                        const ctx = outputAudioContextRef.current;
                        nextStartTime = Math.max(nextStartTime, ctx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setStatus('error');
                    stopConversation();
                },
                onclose: () => {
                    // This can be triggered by stopConversation, so check status
                    if (status !== 'idle') {
                        setStatus('idle');
                    }
                },
            },
        });
    } catch (err) {
        console.error('Failed to start conversation:', err);
        setStatus('error');
    }
  };

  useEffect(() => {
      return () => {
          stopConversation();
      };
  }, [stopConversation]);

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-2 text-center">Assistant Vocal en Direct</h2>
      <p className="text-center text-text-light mb-6">Parlez à votre assistant d'achat en temps réel.</p>

      <div className="flex justify-center mb-6">
          <Button onClick={status === 'connected' ? stopConversation : startConversation}>
            {status === 'idle' && <><ion-icon name="mic-outline" class="mr-2"></ion-icon> Démarrer la Conversation</>}
            {status === 'connecting' && 'Connexion...'}
            {status === 'connected' && <><ion-icon name="stop-circle-outline" class="mr-2"></ion-icon> Arrêter la Conversation</>}
            {status === 'error' && <><ion-icon name="refresh-outline" class="mr-2"></ion-icon> Réessayer</>}
          </Button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto space-y-2">
        {transcripts.length === 0 && (
          <p className="text-text-light text-center pt-20">{
            status === 'idle' ? 'Appuyez sur "Démarrer" pour commencer.' :
            status === 'connecting' ? 'Connexion à l\'assistant...' :
            status === 'connected' ? 'Écoute en cours...' :
            'Une erreur est survenue.'
          }</p>
        )}
        {transcripts.map((text, index) => (
          <p key={index} className={text.startsWith('Vous :') ? 'text-text-main' : 'text-primary font-semibold'}>{text}</p>
        ))}
      </div>
    </Card>
  );
};

export default LiveAssistant;