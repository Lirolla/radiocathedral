
import React, { useState, useEffect, useRef } from 'react';
import { Song, Playlist, ThemeColor, DJ } from '../types';
import { MicIcon, MusicIcon, BoltIcon, SignalIcon, PhoneIcon, BroadcastIcon, PlusIcon, PlayIcon, TrashIcon, ClockIcon, UsersIcon, FolderIcon } from './Icons';
import { uploadSongToR2 } from '../services/storageService';
import Peer, { MediaConnection } from 'peerjs';

interface FaderStripProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon: React.ReactNode;
  activeColor: string;
}

const FaderStrip: React.FC<FaderStripProps> = ({ label, value, onChange, icon, activeColor }) => (
  <div className="flex flex-col items-center gap-2 w-16 group relative">
    <div className={`p-2 rounded-full transition-colors ${value > 0 ? activeColor + ' text-white' : 'bg-gray-800 text-gray-500'}`}>
        {icon}
    </div>
    
    <div className="relative h-64 w-10 bg-gray-950 rounded-lg border border-gray-800 shadow-inner flex justify-center py-2">
        <div className="absolute left-2 top-2 bottom-2 w-0.5 flex flex-col justify-between opacity-30">
            {[...Array(10)].map((_, i) => <div key={i} className="w-1.5 h-px bg-gray-500 -ml-0.5"></div>)}
        </div>
        <input 
            type="range" min="0" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value))}
            className="absolute w-60 h-10 opacity-0 cursor-pointer -rotate-90 top-24 -left-[6.2rem] z-20"
        />
        <div className="absolute w-8 h-10 bg-gray-300 rounded shadow-lg z-10 pointer-events-none flex items-center justify-center border-t border-white/50 border-b border-black/20" style={{ bottom: `${value * 0.85}%` }}>
            <div className="w-full h-0.5 bg-black/50"></div>
        </div>
        <div className="absolute right-2 top-2 bottom-2 w-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div className={`absolute bottom-0 w-full transition-all duration-100 ${value > 80 ? 'bg-red-500' : (value > 60 ? 'bg-yellow-500' : 'bg-green-500')}`} style={{ height: `${value}%`, opacity: value > 0 ? 0.8 : 0 }}></div>
        </div>
    </div>
    <span className="text-[10px] font-bold text-gray-400 tracking-wider bg-black/40 px-2 py-0.5 rounded">{label}</span>
  </div>
);

interface StudioConsoleProps {
  jinglePlaylist?: Playlist; 
  playlists: Playlist[];
  djs: DJ[];
  theme: ThemeColor;
  accentColor: string;
  onAddJingle: (song: Song) => void;
  onForcePlay: (song: Song) => void;
  
  // STUDIO SPECIFIC
  isAutoDJEnabled: boolean;
  isTalkOver?: boolean; 
  onToggleTalkOver?: () => void;
  
  // QUEUE & PLAYBACK
  currentSong: Song | null;
  queue: Song[]; // Studio Preparation Queue
  playingQueue: Song[]; // Real Live Queue
  currentSongIndex: number;

  onQueueAdd: (song: Song) => void;
  onQueueRemove: (id: string) => void;
  onQueueReorder: (from: number, to: number) => void;
  
  onLoadProfile: (djId: string) => boolean;
  onLoadPlaylist: (playlistId: string) => void; // NOVO: Carregar Playlist Manualmente
  onGoLive: () => void;
  onGoOffAir: () => void;
  
  // CONTROLE REAL
  onMasterVolumeChange: (val: number) => void;
  onTogglePlayback: (shouldPlay: boolean) => void;
  onPlaySpecificSong: (index: number) => void; // NOVO: Tocar música específica
}

const StudioConsole: React.FC<StudioConsoleProps> = ({ 
    playlists, djs, theme, accentColor, onAddJingle, onForcePlay, 
    isAutoDJEnabled, isTalkOver = false, onToggleTalkOver,
    currentSong, queue, playingQueue, currentSongIndex,
    onQueueAdd, onQueueRemove, onQueueReorder, onLoadProfile, onLoadPlaylist, onGoLive, onGoOffAir,
    onMasterVolumeChange, onTogglePlayback, onPlaySpecificSong
}) => {
  const [mic1Level, setMic1Level] = useState(80);
  const [mic2Level, setMic2Level] = useState(0);
  const [phoneLevel, setPhoneLevel] = useState(75);
  const [musicLevel, setMusicLevel] = useState(80); // Default 80%
  const [sfxLevel, setSfxLevel] = useState(90);
  const [activePads, setActivePads] = useState<number[]>([]);
  const [loadStatus, setLoadStatus] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Talk Mode (Voice Over)
  const [isTalkMode, setIsTalkMode] = useState(false);

  // Upload & Inputs
  const manualInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingManual, setIsUploadingManual] = useState(false);
  
  // DJ State
  const [selectedDjId, setSelectedDjId] = useState<string>('');
  const [activeDjPlaylist, setActiveDjPlaylist] = useState<Song[]>([]); 
  const [djSongCount, setDjSongCount] = useState(0);
  
  // Manual Playlist Selector State
  const [manualPlaylistId, setManualPlaylistId] = useState('');

  // Edit Mode for Pads
  const [isEditMode, setIsEditMode] = useState(false);
  const [targetPadIndex, setTargetPadIndex] = useState<number | null>(null);

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Phone State
  const [peerId, setPeerId] = useState<string>('');
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'ringing' | 'connected'>('idle');
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const incomingCallRef = useRef<MediaConnection | null>(null); // To store call request

  useEffect(() => {
      if (djs.length > 0 && !selectedDjId) setSelectedDjId(djs[0].id);
  }, [djs]); 

  // Load Pad Data
  useEffect(() => {
      if (selectedDjId) {
          const djEffects = playlists.find(p => p.ownerId === selectedDjId && p.type === 'jingle');
          setActiveDjPlaylist(djEffects?.songs || []);
          
          const djMusic = playlists.find(p => p.ownerId === selectedDjId && p.type === 'music');
          if (djMusic) {
             setDjSongCount(djMusic.songs.length);
          } else {
             const djName = djs.find(d => d.id === selectedDjId)?.name || '';
             const fallbackMusic = playlists.find(p => p.type === 'music' && p.name.includes(djName));
             setDjSongCount(fallbackMusic?.songs.length || 0);
          }
      }
  }, [selectedDjId, playlists, djs]);

  // Clock
  useEffect(() => {
      const updateClock = () => {
          const now = new Date();
          setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      };
      updateClock();
      const interval = setInterval(updateClock, 1000);
      return () => clearInterval(interval);
  }, []);

  // Initialize Phone
  useEffect(() => {
    ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
    ringtoneRef.current.loop = true;
    
    // Create random ID for station
    const stationId = 'station-' + Math.random().toString(36).substr(2, 6);
    const peer = new Peer(stationId, { debug: 1 });

    peer.on('open', (id) => {
        setPeerId(id);
        console.log("Station Peer ID:", id);
    });
    
    peer.on('call', (incomingCall) => {
        console.log("Recebendo chamada de convidado...");
        setPhoneStatus('ringing');
        incomingCallRef.current = incomingCall; // Save ref to answer later
        if (ringtoneRef.current) ringtoneRef.current.play().catch(console.error);
    });

    peerRef.current = peer;
    return () => peer.destroy();
  }, []);

  // --- ACTIONS ---

  const handlePhoneInteract = () => {
      if (phoneStatus === 'idle' && peerId) {
          // Generate Link
          const link = `${window.location.origin}?guest=${peerId}`;
          navigator.clipboard.writeText(link).then(() => {
              alert(`✅ LINK COPIADO!\n\nEnvie este link para o convidado via WhatsApp:\n\n${link}\n\nAssim que ele entrar, o botão piscará em vermelho.`);
          });
      } else if (phoneStatus === 'ringing') {
          // Answer Call
          if (ringtoneRef.current) {
              ringtoneRef.current.pause();
              ringtoneRef.current.currentTime = 0;
          }
          if (incomingCallRef.current) {
              incomingCallRef.current.answer(); // Answer without stream (listen only) or with stream if needed
              
              incomingCallRef.current.on('stream', (remoteStream) => {
                  if (remoteAudioRef.current) {
                      remoteAudioRef.current.srcObject = remoteStream;
                      remoteAudioRef.current.play();
                  }
              });
              setPhoneStatus('connected');
          }
      } else if (phoneStatus === 'connected') {
          // Hangup
          if (incomingCallRef.current) incomingCallRef.current.close();
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
          setPhoneStatus('idle');
      }
  };

  const handleBroadcastToggle = () => {
      if (isAutoDJEnabled) {
          // ESTÁ NO AUTO DJ -> QUER ENTRAR (MANUAL)
          onGoLive();
      } else {
          // ESTÁ NO MANUAL -> QUER SAIR (VOLTAR AUTO DJ)
          onGoOffAir();
      }
  };
  
  const handleTalkToggle = () => {
      const newState = !isTalkMode;
      setIsTalkMode(newState);
      
      // LOGICA CORRIGIDA: PARAR SOM REALMENTE (PAUSE)
      if (newState) {
          // Se ativou "PARAR SOM", pausa a música
          onTogglePlayback(false);
      } else {
          // Se clicou "SOLTAR SOM", volta a tocar
          onTogglePlayback(true);
      }
  };
  
  // Função para controlar o volume mestre
  const handleMusicVolumeChange = (val: number) => {
      setMusicLevel(val);
      onMasterVolumeChange(val / 100); // 0 a 1
  };
  
  // Control Phone Volume
  useEffect(() => {
      if (remoteAudioRef.current) {
          remoteAudioRef.current.volume = phoneLevel / 100;
      }
  }, [phoneLevel]);

  const triggerSound = (index: number, song?: Song) => {
    if (isEditMode) {
        setTargetPadIndex(index);
        fileInputRef.current?.click();
        return;
    }
    if (!song || !song.url) return;

    // --- NOVO MÉTODO DE REPRODUÇÃO (OVERLAY) ---
    // Cria um objeto de áudio independente para tocar por cima da música
    const sfxAudio = new Audio(song.url);
    
    // Usa o volume definido no fader "SFX" (0 a 100)
    sfxAudio.volume = sfxLevel / 100;
    
    // Toca imediatamente sem pausar a música principal
    sfxAudio.play().catch(err => console.error("Erro ao tocar pad:", err));
    
    // Efeito visual no botão
    setActivePads(prev => [...prev, index]);
    setTimeout(() => setActivePads(prev => prev.filter(p => p !== index)), 500);
  };

  const handlePadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && targetPadIndex !== null && selectedDjId) {
          try {
             const newSong = await uploadSongToR2(file);
             newSong.isJingle = true;
             onAddJingle(newSong); 
          } catch(err) { console.error(err); }
      }
      setTargetPadIndex(null);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setIsUploadingManual(true);
      try {
          for (let i=0; i < files.length; i++) {
              const file = files[i];
              if (file.type.startsWith('audio/')) {
                  const song = await uploadSongToR2(file);
                  onQueueAdd(song);
              }
          }
      } catch(err) { console.error(err); } finally {
          setIsUploadingManual(false);
          if (manualInputRef.current) manualInputRef.current.value = '';
      }
  };

  const handleLoadProfile = () => {
      if (!selectedDjId) return;
      const success = onLoadProfile(selectedDjId);
      setLoadStatus(success ? 'Carregado!' : 'Sem músicas');
      setTimeout(() => setLoadStatus(''), 2000);
  };
  
  const handleLoadPlaylistClick = () => {
      if(manualPlaylistId) {
          onLoadPlaylist(manualPlaylistId);
      }
  };

  // --- DRAG AND DROP HANDLERS ---
  const onDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItemIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedItemIndex === null || draggedItemIndex === index) return;
      // Reorder logic handled in Drop or continuously? Continuous is better for UX but simpler here is Drop.
  };

  const onDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedItemIndex === null) return;
      onQueueReorder(draggedItemIndex, index);
      setDraggedItemIndex(null);
  };

  const pads = Array(12).fill(null).map((_, i) => activeDjPlaylist[i] || null);
  
  const getPadColorClass = (index: number, isActive: boolean) => {
      const colors = [
          'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500',
          'bg-green-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
          'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
      ];
      const base = colors[index % colors.length];
      if (isActive) return `${base} brightness-150 scale-95 ring-2 ring-white`;
      return `${base} opacity-80 hover:opacity-100 hover:scale-[1.02]`;
  };

  // Determine what list to show:
  const displayList = isAutoDJEnabled ? queue : playingQueue;

  // CLASSE PARA BLOQUEAR A MESA QUANDO EM AUTO DJ
  const disabledOverlayClass = isAutoDJEnabled 
    ? "opacity-30 pointer-events-none grayscale filter" 
    : "";

  return (
    <div className="h-full p-6 overflow-y-auto flex flex-col items-center bg-gray-950">
        <audio ref={remoteAudioRef} className="hidden" />

        <header className="mb-4 w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 relative z-50">
             <div className="flex items-center gap-4">
                <SignalIcon className={`w-10 h-10 ${accentColor}`} />
                <div>
                    <h2 className="text-3xl font-bold text-white">Estúdio Pro</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className={`text-xs font-bold ${isAutoDJEnabled ? 'text-green-500' : 'text-red-500'}`}>
                            {isAutoDJEnabled ? 'AUTO DJ NO AR (MODO ESPERA)' : 'VOCÊ ESTÁ NO AR (AO VIVO)'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex justify-center">
                 <div className="bg-black/50 border border-gray-800 rounded-xl px-8 py-2 flex flex-col items-center shadow-inner">
                     <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        Hora Certa
                     </span>
                     <div className="text-4xl font-mono font-bold text-white tracking-widest tabular-nums leading-none mt-1">
                         {currentTime}
                     </div>
                 </div>
            </div>
            
            <button 
                onClick={handleBroadcastToggle}
                className={`w-64 h-16 rounded-full border-4 flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 z-50 ${
                    !isAutoDJEnabled 
                    ? 'bg-red-600 border-red-400 shadow-red-600/50 text-white hover:bg-red-500 animate-pulse' 
                    : 'bg-green-600 border-green-400 shadow-green-600/50 text-white hover:bg-green-500'
                }`}
            >
                <BroadcastIcon className="w-8 h-8" />
                <div className="text-left leading-tight">
                    <span className="block text-[10px] font-bold opacity-80 uppercase tracking-widest">
                        {!isAutoDJEnabled ? 'TRANSMITINDO' : 'ESTÚDIO FECHADO'}
                    </span>
                    <span className="block font-black text-xl uppercase tracking-tighter">
                        {!isAutoDJEnabled ? 'SAIR DO AR' : 'ENTRAR NO AR'}
                    </span>
                </div>
            </button>
        </header>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            
            {/* LEFT: MIXER & PADS (BLOCKED WHEN AUTO DJ IS ON) */}
            <div className={`lg:col-span-8 flex flex-col gap-6 transition-all duration-500 relative ${disabledOverlayClass}`}>
                
                {/* Visual Overlay for Disabled State */}
                {isAutoDJEnabled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/80 text-white border border-gray-600 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm transform -rotate-3">
                            <p className="font-bold text-xl text-center">MESA BLOQUEADA</p>
                            <p className="text-xs text-gray-400 text-center">Clique em "ENTRAR NO AR" para liberar</p>
                        </div>
                    </div>
                )}

                <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 shadow-xl relative">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-2">Mixer Principal</h3>
                    <div className="flex justify-between gap-2 px-4 py-6 bg-black/20 rounded-2xl border border-white/5 shadow-inner min-h-[300px]">
                        <FaderStrip label="MIC 1" value={mic1Level} onChange={setMic1Level} icon={<MicIcon className="w-4 h-4" />} activeColor="bg-green-500" />
                        <FaderStrip label="MIC 2" value={mic2Level} onChange={setMic2Level} icon={<MicIcon className="w-4 h-4" />} activeColor="bg-green-500" />
                        
                        {/* PHONE CHANNEL - CUSTOM & BIGGER */}
                        <div className="flex flex-col items-center gap-3 w-20 group relative pointer-events-auto z-20">
                            
                            {/* THE BIG BUTTON */}
                            <button 
                                onClick={handlePhoneInteract}
                                title={
                                    phoneStatus === 'idle' ? 'Clique para COPIAR LINK DE CONVIDADO' :
                                    phoneStatus === 'ringing' ? 'ATENDER CHAMADA' : 'DESLIGAR'
                                }
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-4 shadow-2xl transform active:scale-90 ${
                                    phoneStatus === 'ringing' ? 'bg-red-600 animate-pulse text-white border-white scale-110' : 
                                    phoneStatus === 'connected' ? 'bg-green-500 text-white border-green-300' : 
                                    'bg-blue-600 text-white border-blue-400 hover:bg-blue-500 hover:scale-105'
                                }`}
                            >
                                <PhoneIcon className="w-8 h-8" />
                            </button>
                            
                            {/* FADER */}
                            <div className="relative h-52 w-12 bg-gray-950 rounded-lg border border-gray-800 flex justify-center py-2 shadow-inner">
                                <div className="absolute right-2 top-2 bottom-2 w-1.5 bg-gray-900 rounded-full overflow-hidden">
                                    <div className={`absolute bottom-0 w-full transition-all duration-100 bg-blue-400`} style={{ height: `${phoneLevel}%` }}></div>
                                </div>
                                <input type="range" min="0" max="100" value={phoneLevel} onChange={(e) => setPhoneLevel(parseInt(e.target.value))} className="absolute w-60 h-10 opacity-0 cursor-pointer -rotate-90 top-24 -left-[6.2rem] z-20" />
                            </div>
                            
                            {/* LABEL */}
                            <div className="flex flex-col items-center text-center">
                                <span className="text-[10px] font-black text-gray-400 tracking-widest">GUEST</span>
                                <span className={`text-[9px] font-bold uppercase whitespace-nowrap px-1 rounded ${
                                    phoneStatus === 'idle' ? 'bg-blue-900/50 text-blue-300' : 
                                    phoneStatus === 'ringing' ? 'bg-red-900/50 text-red-300' : 
                                    'bg-green-900/50 text-green-300'
                                }`}>
                                    {phoneStatus === 'idle' ? 'COPIAR LINK' : (phoneStatus === 'ringing' ? 'ATENDER' : 'ONLINE')}
                                </span>
                            </div>
                        </div>

                        <FaderStrip label="MUSIC" value={musicLevel} onChange={handleMusicVolumeChange} icon={<MusicIcon className="w-4 h-4" />} activeColor="bg-purple-600" />
                        <FaderStrip label="SFX" value={sfxLevel} onChange={setSfxLevel} icon={<BoltIcon className="w-4 h-4" />} activeColor="bg-yellow-500" />
                    </div>
                </div>

                <div className="bg-gray-800/50 rounded-3xl p-4 border border-white/5 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <UsersIcon className="w-4 h-4 text-purple-400" />
                             <select 
                                value={selectedDjId}
                                onChange={(e) => setSelectedDjId(e.target.value)}
                                className="bg-gray-900 border border-gray-700 text-white text-sm font-bold rounded-lg px-2 py-1 outline-none pointer-events-auto"
                            >
                                <option value="" disabled>Locutor</option>
                                {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.name}</option>)}
                            </select>
                            <button onClick={handleLoadProfile} disabled={!selectedDjId} className={`bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg text-xs font-bold pointer-events-auto ${loadStatus ? 'bg-green-600' : ''}`}>
                                {loadStatus || 'CARREGAR PERFIL'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 flex-1">
                        {pads.map((sound, idx) => (
                            <button
                                key={idx}
                                onClick={() => triggerSound(idx, sound || undefined)}
                                className={`relative h-20 rounded-lg transition-all shadow-md flex items-center justify-center overflow-hidden ${sound ? getPadColorClass(idx, activePads.includes(idx)) : 'bg-gray-700 opacity-30'}`}
                            >
                                {sound ? <span className="text-[9px] font-bold text-white px-1 leading-tight">{sound.title}</span> : <span className="text-xs text-gray-500">{idx+1}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: PLAYLIST CRATE (DRAG & DROP) */}
            <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-3xl p-4 flex flex-col h-[700px] relative">
                 <div className="mb-4 pb-4 border-b border-gray-800">
                     <h3 className="text-lg font-bold text-white">{isAutoDJEnabled ? 'Preparação (Off-Air)' : 'Tocando Agora (No Ar)'}</h3>
                     <p className="text-[10px] text-gray-500 mb-4">{isAutoDJEnabled ? 'Organize a lista aqui antes de entrar.' : 'Lista sendo transmitida ao vivo.'}</p>
                     
                     {/* MANUAL PLAYLIST LOADER (New Feature) */}
                     {isAutoDJEnabled && (
                         <div className="flex gap-2 mb-4 bg-gray-800 p-2 rounded-lg">
                             <div className="flex-1">
                                 <select 
                                     value={manualPlaylistId}
                                     onChange={(e) => setManualPlaylistId(e.target.value)}
                                     className="w-full bg-gray-950 text-white text-xs p-2 rounded border border-gray-700 outline-none"
                                 >
                                     <option value="">Selecione uma Playlist...</option>
                                     {playlists.filter(p => p.type === 'music').map(p => (
                                         <option key={p.id} value={p.id}>{p.name} ({p.songs.length})</option>
                                     ))}
                                 </select>
                             </div>
                             <button 
                                 onClick={handleLoadPlaylistClick}
                                 className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold"
                             >
                                 Carregar
                             </button>
                         </div>
                     )}

                     {/* CONTROL BUTTONS (BLOCKED WHEN AUTO DJ IS ON) */}
                     <div className={`grid grid-cols-2 gap-2 transition-all duration-300 ${disabledOverlayClass}`}>
                        <button 
                            onClick={onToggleTalkOver}
                            className={`font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${isTalkOver ? 'bg-cyan-500 text-white animate-pulse' : 'bg-gray-800 text-gray-300'}`}
                        >
                            <MicIcon className="w-4 h-4" /> {isTalkOver ? 'LOCUÇÃO ON' : 'LOCUÇÃO'}
                        </button>
                        <button 
                            onClick={handleTalkToggle}
                            className={`font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${isTalkMode ? 'bg-orange-500 text-white animate-pulse' : 'bg-red-600 text-white'}`}
                        >
                            {isTalkMode ? 'SOLTAR SOM' : 'PARAR SOM'}
                        </button>
                     </div>
                 </div>

                 {/* QUEUE LIST (ALWAYS ACTIVE FOR PREP) */}
                 <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
                     {displayList.length > 0 ? (
                        displayList.map((song, idx) => {
                            // If Manual Live Mode: Highlight current song
                            const isPlaying = !isAutoDJEnabled && idx === currentSongIndex;
                            const isPast = !isAutoDJEnabled && idx < currentSongIndex;
                            
                            // SEMPRE habilitado para arrastar agora, mas a lista exibida muda
                            const canDrag = true; 
                            
                            return (
                                <div 
                                    key={`${song.id}-${idx}`}
                                    draggable={canDrag} 
                                    onDragStart={(e) => onDragStart(e, idx)}
                                    onDragOver={(e) => onDragOver(e, idx)}
                                    onDrop={(e) => onDrop(e, idx)}
                                    className={`
                                        border rounded-lg p-2 flex items-center justify-between group transition cursor-pointer relative
                                        ${isPlaying ? 'bg-green-900/30 border-green-500 shadow-lg' : isPast ? 'opacity-40' : 'bg-gray-800/40 hover:bg-gray-800 border-gray-700/30'}
                                        ${draggedItemIndex === idx ? 'opacity-50 border-dashed border-yellow-400' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${isPlaying ? 'bg-green-500 text-white' : 'bg-gray-900 text-gray-500'}`}>
                                            {isPlaying ? <MusicIcon className="w-3 h-3 animate-pulse" /> : idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className={`text-sm font-bold truncate ${isPlaying ? 'text-green-400' : 'text-gray-200'}`}>{song.title}</h4>
                                            <p className="text-[10px] text-gray-500 truncate">{song.artist}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {/* Play Now Button (Only in Live Mode and not currently playing) */}
                                        {!isAutoDJEnabled && !isPlaying && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onPlaySpecificSong(idx); }} 
                                                className="text-white hover:text-green-400 opacity-0 group-hover:opacity-100 transition p-1 bg-white/10 rounded-full"
                                                title="Tocar Agora"
                                            >
                                                <PlayIcon className="w-3 h-3" />
                                            </button>
                                        )}

                                        {isAutoDJEnabled && (
                                            <button onClick={() => onQueueRemove(song.id)} className="text-gray-600 hover:text-red-400 p-1"><TrashIcon className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                     ) : (
                         <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                             <p className="text-xs">Lista Vazia</p>
                             <p className="text-[10px]">Carregue o perfil do DJ ou adicione músicas</p>
                         </div>
                     )}
                 </div>
                 
                 {isAutoDJEnabled && (
                    <div className="mt-2 pt-2 border-t border-gray-800 text-center flex justify-between px-2">
                        <button onClick={() => manualInputRef.current?.click()} className="text-[10px] text-blue-400 flex items-center gap-1 hover:text-white transition"><PlusIcon className="w-3 h-3" /> Add Música</button>
                    </div>
                 )}
                 <input type="file" multiple accept="audio/*" ref={manualInputRef} className="hidden" onChange={handleManualUpload} />
                 <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handlePadUpload} />
            </div>
        </div>
    </div>
  );
};

export default StudioConsole;
