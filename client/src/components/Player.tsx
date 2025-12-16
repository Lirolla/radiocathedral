import React, { useRef, useState, useEffect } from 'react';
import { Song } from '../types';
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, SparklesIcon, MusicIcon, MicIcon, MicOffIcon } from './Icons';
import Visualizer from './Visualizer';
import { generateDJIntro } from '../services/geminiService';

interface PlayerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentSong: Song | null;
  playlist: Song[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  setVolume: (v: number) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  isAutoDJEnabled: boolean;
  toggleAutoDJ: () => void;
  isTalkOver?: boolean; // New prop for ducking
}

const Player: React.FC<PlayerProps> = ({ 
  audioRef,
  currentSong, 
  playlist, 
  isPlaying,
  progress,
  duration,
  volume,
  setVolume,
  onSeek,
  onTogglePlay,
  onNext, 
  onPrev,
  isAutoDJEnabled,
  toggleAutoDJ,
  isTalkOver = false
}) => {
  const [djAnnouncement, setDjAnnouncement] = useState<string | null>(null);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);
  
  // Microphone State (Local within player for quick mic toggle, distinct from Studio Voice Over which ducks)
  const [isMicOn, setIsMicOn] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);

  // Handle Volume Ducking based on isTalkOver OR isMicOn
  useEffect(() => {
    if (audioRef.current) {
        if (isTalkOver || isMicOn) {
            // Ducking: 20% of current volume setting
            audioRef.current.volume = volume * 0.2; 
        } else {
            // Normal volume
            audioRef.current.volume = volume;
        }
    }
  }, [volume, isTalkOver, isMicOn]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  const handleGeminiIntro = async () => {
    if (!currentSong || isGeneratingIntro) return;
    setIsGeneratingIntro(true);
    
    // Baixar volume da música (efeito ducking) manual para o AI
    if(audioRef.current) audioRef.current.volume = 0.2;

    const intro = await generateDJIntro(currentSong.title, currentSong.artist);
    setDjAnnouncement(intro);

    // Falar o texto (Web Speech API)
    const utterance = new SpeechSynthesisUtterance(intro);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; 
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
       // Restaurar volume se não houver outras flags de ducking
       if(audioRef.current && !isMicOn && !isTalkOver) {
         audioRef.current.volume = volume;
       }
       setIsGeneratingIntro(false);
       setTimeout(() => setDjAnnouncement(null), 5000);
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- Microphone Logic (Simple Player Toggle) ---
  const toggleMic = async () => {
    if (isMicOn) {
      // Turn Off
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      if (micAudioContextRef.current) {
        micAudioContextRef.current.close();
        micAudioContextRef.current = null;
      }
      setIsMicOn(false);
    } else {
      // Turn On
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        // Setup Audio Context for Mic Monitoring/Broadcast
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        micAudioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(ctx.destination);
        
        setIsMicOn(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Erro ao acessar microfone. Verifique as permissões.");
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 text-white p-4 pb-6 z-50">
      {/* AI Notification Overlay */}
      {djAnnouncement && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-3 rounded-full shadow-lg border border-white/20 animate-bounce">
            <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-yellow-300" />
                <span className="font-bold text-sm">DJ AI: "{djAnnouncement}"</span>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
        
        {/* Info Song */}
        <div className="w-full md:w-1/4 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden shadow-lg ${isPlaying ? 'shadow-purple-500/20' : ''}`}>
                {currentSong ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-700 to-blue-900 flex items-center justify-center">
                        <MusicIcon className="w-6 h-6 text-white/50" />
                    </div>
                ) : (
                    <div className="w-full h-full bg-gray-800" />
                )}
            </div>
            <div className="overflow-hidden">
                <h3 className="font-bold text-gray-100 truncate">{currentSong?.title || "Selecione uma música"}</h3>
                <p className="text-xs text-gray-400 truncate">{currentSong?.artist || "RadioTocai"}</p>
            </div>
        </div>

        {/* Controls & Progress */}
        <div className="w-full md:w-2/4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-6">
                <button 
                  onClick={toggleAutoDJ}
                  className={`text-xs px-2 py-1 rounded border ${isAutoDJEnabled ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-gray-600 text-gray-500'}`}
                  title="Auto DJ toca a próxima música automaticamente"
                >
                    AUTO DJ: {isAutoDJEnabled ? 'ON' : 'OFF'}
                </button>
                
                <button onClick={onPrev} className="text-gray-400 hover:text-white transition">
                    <SkipBackIcon className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={onTogglePlay}
                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                >
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}
                </button>
                
                <button onClick={onNext} className="text-gray-400 hover:text-white transition">
                    <SkipForwardIcon className="w-6 h-6" />
                </button>

                {/* MIC BUTTON */}
                <button 
                    onClick={toggleMic}
                    className={`p-3 rounded-full transition-all border ${
                        isMicOn || isTalkOver 
                        ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' 
                        : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                    }`}
                    title={isMicOn ? "Desativar Microfone" : "Ativar Microfone Rápido"}
                >
                    {isMicOn || isTalkOver ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                </button>

                <button 
                    onClick={handleGeminiIntro}
                    disabled={!currentSong || isGeneratingIntro || isMicOn || isTalkOver}
                    className={`p-2 rounded-full transition ${
                        isGeneratingIntro 
                        ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' 
                        : 'text-purple-400 hover:bg-purple-500/20 hover:text-purple-300'
                    }`}
                    title="Gerar anúncio AI Gemini"
                >
                    <SparklesIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
                <span>{formatTime(progress)}</span>
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={progress} 
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                />
                <span>{formatTime(duration)}</span>
            </div>
        </div>

        {/* Visualizer & Volume */}
        <div className="w-full md:w-1/4 flex items-center gap-4 justify-end">
            <div className="h-8 w-24 hidden md:block rounded overflow-hidden bg-black/20">
                <Visualizer audioRef={audioRef} isPlaying={isPlaying} />
            </div>
            <div className="flex items-center gap-2 w-24">
                <div className="h-1 flex-1 bg-gray-800 rounded-lg relative group">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gray-500 rounded-lg" 
                        style={{ width: `${volume * 100}%` }}
                    />
                    <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Player;