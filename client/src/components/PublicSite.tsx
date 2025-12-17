
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, ThemeColor, RadioStationConfig, Playlist, Vote, InboxMessage, ScheduleItem } from '../types';
import { PlayIcon, PauseIcon, MusicIcon, ClockIcon, PhoneIcon, MegaphoneIcon, CalendarIcon, LockIcon, StarIcon, CheckIcon, XMarkIcon, HeartIcon, MicIcon } from './Icons';
import LoginModal from './LoginModal';
import { registerListener, updateListenerHeartbeat, unregisterListener } from '../services/dbService';

interface PublicSiteProps {
  currentSong: Song | null;
  nextSong: Song | null;
  history: Song[];
  isPlaying: boolean;
  onAdminLogin: (pass: string) => void;
  onLocutorLogin: (key: string) => void;
  onTogglePlay: () => void;
  config: RadioStationConfig;
  // Voting Props
  top10Playlist?: Playlist;
  votes?: Vote[];
  onVote?: (songId: string, songTitle: string, artist: string, name: string, email: string) => Promise<void>;
  // Messaging Props
  onSendMessage?: (msg: Omit<InboxMessage, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  // Schedule Props
  schedule?: ScheduleItem[];
  playlists?: Playlist[];
}

const PublicSite: React.FC<PublicSiteProps> = ({ 
  currentSong, 
  nextSong,
  history, 
  isPlaying, 
  onAdminLogin,
  onLocutorLogin,
  onTogglePlay,
  config,
  top10Playlist,
  votes = [],
  onVote,
  onSendMessage,
  schedule = [],
  playlists = []
}) => {
  // Classic Tab State (For Template 1)
  const [activeTab, setActiveTab] = useState<'home' | 'requests' | 'contact' | 'top10' | 'about' | 'schedule'>('home');
  const [time, setTime] = useState<string>('');
  
  // Login State
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isLocutorLoginOpen, setIsLocutorLoginOpen] = useState(false);
  const [locutorKey, setLocutorKey] = useState('');

  // Voting Modal State
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [selectedVoteSong, setSelectedVoteSong] = useState<Song | null>(null);
  const [voterName, setVoterName] = useState('');
  const [voterEmail, setVoterEmail] = useState('');
  const [voteSuccess, setVoteSuccess] = useState(false);

  // Request Form State
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqSong, setReqSong] = useState('');
  const [reqDedication, setReqDedication] = useState('');
  const [reqSuccess, setReqSuccess] = useState(false);

  // Love Story Form State
  const [loveName, setLoveName] = useState('');
  const [loveEmail, setLoveEmail] = useState('');
  const [loveStory, setLoveStory] = useState('');
  const [loveSuccess, setLoveSuccess] = useState(false);

  // Schedule Day Selection State
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<number>(new Date().getDay());

  const isOnePage = config.publicTemplate === 'template2';

  // Calculate Real Top 10
  const realTop10 = useMemo(() => {
      if (!top10Playlist || top10Playlist.songs.length === 0) return [];
      
      const counts: Record<string, number> = {};
      top10Playlist.songs.forEach(s => counts[s.id] = 0);
      votes.forEach(v => {
          if (counts[v.songId] !== undefined) counts[v.songId]++;
      });

      return top10Playlist.songs.map(s => ({
          ...s,
          voteCount: counts[s.id] || 0
      })).sort((a, b) => b.voteCount - a.voteCount).map((s, idx) => ({ ...s, rank: idx + 1 }));

  }, [top10Playlist, votes]);

  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        try {
            const timeString = now.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: config.timezone || 'America/Sao_Paulo'
            });
            setTime(timeString);
        } catch (error) {
            console.error("Invalid Timezone", error);
            setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [config.timezone]);

  // Listener tracking
  const listenerIdRef = useRef<string>(`listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  useEffect(() => {
    const listenerId = listenerIdRef.current;
    
    // Register listener
    registerListener(listenerId);
    
    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      updateListenerHeartbeat(listenerId);
    }, 30000);
    
    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      unregisterListener(listenerId);
    };
  }, []);

  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      } else if (id === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleAdminSubmit = (password: string) => {
      if (password === 'Pagotto24') {
          setIsAdminLoginOpen(false);
          onAdminLogin(password);
      } else {
          alert("Senha incorreta!");
      }
  };
  
  const handleLocutorSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onLocutorLogin(locutorKey);
  };

  const handleVoteClick = (song: Song) => {
      setSelectedVoteSong(song);
      setIsVotingOpen(true);
      setVoteSuccess(false);
  };

  const submitVote = async (e: React.FormEvent) => {
      e.preventDefault();
      if (onVote && selectedVoteSong && voterName && voterEmail) {
          await onVote(selectedVoteSong.id, selectedVoteSong.title, selectedVoteSong.artist, voterName, voterEmail);
          setVoteSuccess(true);
          setTimeout(() => {
              setIsVotingOpen(false);
              setVoterName('');
              setVoterEmail('');
              setSelectedVoteSong(null);
          }, 2000);
      }
  };

  const submitRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (onSendMessage && reqName && reqEmail && reqSong) {
          await onSendMessage({
              type: 'song_request',
              senderName: reqName,
              senderEmail: reqEmail,
              content: reqSong,
              extraInfo: reqDedication
          });
          setReqSuccess(true);
          setTimeout(() => {
              setReqSuccess(false);
              setReqName('');
              setReqEmail('');
              setReqSong('');
              setReqDedication('');
          }, 3000);
      }
  };

  const submitLoveStory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (onSendMessage && loveName && loveEmail && loveStory) {
          await onSendMessage({
              type: 'love_story',
              senderName: loveName,
              senderEmail: loveEmail,
              content: loveStory
          });
          setLoveSuccess(true);
          setTimeout(() => {
              setLoveSuccess(false);
              setLoveName('');
              setLoveEmail('');
              setLoveStory('');
          }, 3000);
      }
  };

  // Dynamic Theme Colors
  const getThemeColors = () => {
      switch(config.theme) {
          case 'blue': return {
              gradient: 'from-blue-500 via-cyan-500 to-white',
              text: 'text-blue-300',
              border: 'border-blue-500',
              bg: 'bg-blue-600',
              shadow: 'shadow-blue-500/30'
          };
          case 'red': return {
              gradient: 'from-red-500 via-orange-500 to-white',
              text: 'text-red-300',
              border: 'border-red-500',
              bg: 'bg-red-600',
              shadow: 'shadow-red-500/30'
          };
          case 'white': return {
              gradient: 'from-white via-gray-300 to-gray-500',
              text: 'text-gray-300',
              border: 'border-white',
              bg: 'bg-white',
              shadow: 'shadow-white/30'
          };
          default: return { // Purple
              gradient: 'from-purple-500 via-pink-500 to-white',
              text: 'text-purple-300',
              border: 'border-purple-500',
              bg: 'bg-purple-600',
              shadow: 'shadow-purple-500/30'
          };
      }
  };

  const colors = getThemeColors();

  // --- SUB-COMPONENTS RENDERERS ---

  const renderTop10 = () => (
    <div id="top10" className="w-full max-w-4xl py-20 animate-in slide-in-from-right-10 fade-in duration-500 mx-auto">
        <header className="mb-12 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                TOP 10 MAIS PEDIDAS
            </h2>
            <p className="text-gray-400 tracking-widest uppercase text-xs font-bold">As favoritas da semana na {config.name}</p>
        </header>
        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-4 md:p-8">
            {realTop10.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    Ainda não há votações nesta semana. Seja o primeiro a votar!
                </div>
            ) : (
                realTop10.map((song, index) => (
                    <div key={index} className="flex items-center gap-4 md:gap-6 p-4 mb-2 hover:bg-white/5 rounded-xl transition-all group border-b border-white/5 last:border-0">
                        <div className={`text-4xl font-black italic w-16 text-center ${index < 3 ? colors.text : 'text-gray-700'}`}>
                            #{song.rank}
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-white transition">{song.title}</h3>
                            <p className="text-sm text-gray-400">{song.artist}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{song.voteCount} votos</div>
                            <button 
                                onClick={() => handleVoteClick(song)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white text-white hover:text-black transition flex items-center gap-1`}
                            >
                                <StarIcon className="w-3 h-3" />
                                Votar
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );

  const renderRequests = () => (
    <div id="requests" className="w-full max-w-2xl py-20 animate-in slide-in-from-right-10 fade-in duration-500 mx-auto">
        <header className="mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            FAÇA SEU PEDIDO
        </h2>
        <p className="text-gray-400">Qual música não pode faltar na nossa programação?</p>
        </header>

        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 text-left shadow-2xl relative overflow-hidden">
            {reqSuccess && (
                <div className="absolute inset-0 bg-green-600/90 z-20 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in">
                    <CheckIcon className="w-16 h-16 mb-4" />
                    <h3 className="text-2xl font-bold">Pedido Enviado!</h3>
                    <p>Fique ligado na programação.</p>
                </div>
            )}
            
            <form onSubmit={submitRequest} className="flex flex-col gap-6">
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Seu Nome</label>
                    <input type="text" required value={reqName} onChange={e => setReqName(e.target.value)} className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-white transition" placeholder="Quem está pedindo?" />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Seu Email</label>
                    <input type="email" required value={reqEmail} onChange={e => setReqEmail(e.target.value)} className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-white transition" placeholder="Para avisarmos quando tocar" />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Música / Artista</label>
                    <input type="text" required value={reqSong} onChange={e => setReqSong(e.target.value)} className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-white transition" placeholder="Ex: Evidências - Chitãozinho e Xororó" />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Oferecimento (Opcional)</label>
                    <textarea value={reqDedication} onChange={e => setReqDedication(e.target.value)} className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-white transition resize-none h-24" placeholder="Para quem vai essa música?" />
                </div>
                <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 hover:brightness-110 ${colors.bg}`}>
                    ENVIAR PEDIDO
                </button>
            </form>
        </div>
    </div>
  );

  const renderLoveStory = () => (
    <div className="w-full max-w-2xl py-20 animate-in slide-in-from-right-10 fade-in duration-500 mx-auto">
        <header className="mb-12 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-600 flex items-center justify-center gap-3">
                <HeartIcon className="w-10 h-10 text-pink-500 animate-pulse" />
                HISTÓRIAS DE AMOR
            </h2>
            <p className="text-pink-200/70">Abra seu coração. Vamos ler sua história no ar.</p>
        </header>

        <div className="bg-gradient-to-b from-pink-900/40 to-black/40 backdrop-blur-md rounded-3xl border border-pink-500/20 p-8 text-left shadow-2xl relative overflow-hidden">
            {loveSuccess && (
                <div className="absolute inset-0 bg-pink-600/90 z-20 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in">
                    <HeartIcon className="w-16 h-16 mb-4" />
                    <h3 className="text-2xl font-bold">História Recebida!</h3>
                    <p>O amor está no ar...</p>
                </div>
            )}

            <form onSubmit={submitLoveStory} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-pink-400 mb-2">Seu Nome</label>
                        <input type="text" required value={loveName} onChange={e => setLoveName(e.target.value)} className="w-full bg-black/30 border border-pink-900/50 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold text-pink-400 mb-2">Seu Email</label>
                        <input type="email" required value={loveEmail} onChange={e => setLoveEmail(e.target.value)} className="w-full bg-black/30 border border-pink-900/50 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-pink-400 mb-2">Sua História</label>
                    <textarea 
                        required 
                        value={loveStory} 
                        onChange={e => setLoveStory(e.target.value)} 
                        className="w-full bg-black/30 border border-pink-900/50 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition resize-none h-40" 
                        placeholder="Escreva aqui sua declaração, história ou recado romântico..." 
                    />
                </div>
                <button type="submit" className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 hover:brightness-110 bg-gradient-to-r from-pink-600 to-red-600">
                    ENVIAR COM AMOR
                </button>
            </form>
        </div>
    </div>
  );

  const renderAbout = () => (
    <div id="about" className="w-full max-w-3xl py-20 animate-in slide-in-from-right-10 fade-in duration-500 mx-auto">
        <header className="mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            QUEM SOMOS
        </h2>
        <p className="text-gray-400">Conheça a história da {config.name}</p>
        </header>

        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 text-left shadow-xl">
            <div className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line">
                {config.aboutUsText || "Texto sobre a rádio não configurado."}
                </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10 text-center">
                <div>
                    <h4 className="font-bold text-white text-2xl">24h</h4>
                    <span className="text-xs text-gray-500 uppercase">No Ar</span>
                </div>
                <div>
                    <h4 className="font-bold text-white text-2xl">100%</h4>
                    <span className="text-xs text-gray-500 uppercase">Digital</span>
                </div>
                <div>
                    <h4 className="font-bold text-white text-2xl">HQ</h4>
                    <span className="text-xs text-gray-500 uppercase">Audio</span>
                </div>
            </div>
        </div>
    </div>
  );

  const renderSchedule = () => {
    const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    // Filtrar schedule pelo dia selecionado
    const daySchedule = schedule
      .filter(item => item.isActive && item.days.includes(selectedScheduleDay))
      .sort((a, b) => a.time.localeCompare(b.time));
    
    return (
      <div id="schedule" className="w-full max-w-4xl py-20 animate-in slide-in-from-right-10 fade-in duration-500 mx-auto">
        <header className="mb-8 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            PROGRAMAÇÃO
          </h2>
          <p className="text-gray-400 text-sm">Confira nossa grade de horários semanal</p>
        </header>

        {/* Tabs dos dias da semana */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {DAYS_OF_WEEK.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedScheduleDay(index)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedScheduleDay === index
                  ? `${colors.bg} text-white shadow-lg`
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-4 md:p-6">
          <h3 className="text-xl font-bold text-white mb-4 text-center">{DAYS_FULL[selectedScheduleDay]}</h3>
          
          {daySchedule.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhuma programação para {DAYS_FULL[selectedScheduleDay]}.
            </div>
          ) : (
            <div className="space-y-3">
              {daySchedule.map((item, index) => {
                const playlist = playlists.find(p => p.id === item.playlistId);
                const playlistName = playlist ? playlist.name : 'Playlist não encontrada';
                
                return (
                  <div key={index} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-all border-b border-white/5 last:border-0">
                    {/* Horário */}
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} text-white`}>
                        <ClockIcon className="w-4 h-4" />
                      </div>
                      <span className="text-lg font-bold text-white">{item.time}</span>
                    </div>
                    
                    {/* Nome da Playlist */}
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-white">{playlistName}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContact = () => (
    <div id="contact" className="w-full max-w-3xl py-20 animate-in slide-in-from-right-10 fade-in duration-500 mx-auto">
        <header className="mb-12 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                FALE CONOSCO
            </h2>
            <p className="text-gray-400">Entre em contato com nossa produção</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center text-center gap-4 hover:bg-white/5 transition group">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${colors.bg} text-white group-hover:scale-110 transition`}>
                    <PhoneIcon className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Telefone & WhatsApp</h3>
                    <p className="text-gray-400 mt-1">{config.contact.phone || "(00) 0000-0000"}</p>
                    <p className="text-green-400 font-bold mt-1">{config.contact.whatsapp || "Indisponível"}</p>
                </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center text-center gap-4 hover:bg-white/5 transition group">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gray-700 text-white group-hover:scale-110 transition`}>
                    <MegaphoneIcon className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Comercial & E-mail</h3>
                    <p className="text-gray-400 mt-1">{config.contact.email || "contato@radio.com"}</p>
                    <p className="text-gray-500 text-xs mt-2">Anuncie sua marca conosco</p>
                </div>
            </div>

            <div className="col-span-1 md:col-span-2 bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="bg-gray-800 p-4 rounded-xl">
                        <CalendarIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Endereço do Estúdio</h3>
                    <p className="text-gray-300 mt-1">{config.contact.address || "Endereço não informado"}</p>
                    <p className="text-gray-500">{config.contact.city || "Cidade/UF"}</p>
                </div>
            </div>
        </div>
    </div>
  );

  const renderHomeHero = () => (
    <div id="home" className={`flex flex-col items-center justify-center w-full max-w-4xl py-20 animate-in fade-in zoom-in duration-700 mx-auto ${isOnePage ? 'min-h-screen' : ''}`}>
        
        {/* Status Badge */}
        <div className={`mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium ${colors.text}`}>
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
            {isPlaying ? 'Transmitindo Agora' : 'Rádio Pausada'}
        </div>

        {/* Big Typography (Title) */}
        <h1 className="text-4xl md:text-7xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-2xl text-center leading-tight px-4">
            {currentSong ? currentSong.title : config.name.toUpperCase()}
        </h1>

        {/* Center Player / CD */}
        <div className="relative group cursor-pointer mb-8" onClick={onTogglePlay}>
            {/* Glow Effect */}
            <div className={`absolute -inset-4 bg-gradient-to-r ${colors.gradient} rounded-full blur-xl opacity-40 group-hover:opacity-70 transition duration-500 ${isPlaying ? 'animate-pulse' : ''}`}></div>
            
            {/* The CD / Play Button */}
            <div className="relative w-40 h-40 md:w-56 md:h-56 bg-gray-900 rounded-full border-4 border-gray-700 flex items-center justify-center shadow-2xl overflow-hidden">
                
                {/* Spinning Art */}
                <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50 ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''}`}></div>
                
                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] group-hover:bg-black/10 transition">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center pl-2 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        {isPlaying ? (
                            <PauseIcon className="w-8 h-8 text-black" />
                        ) : (
                            <PlayIcon className="w-8 h-8 text-black" />
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Subtitle (Artist / Default Slogan) - MOVED HERE and ENLARGED */}
        <p className="text-[4vw] md:text-4xl text-gray-200 font-light tracking-wide mb-8 text-center drop-shadow-md whitespace-nowrap w-full overflow-hidden text-ellipsis px-4 max-w-full">
            {currentSong ? currentSong.artist : "A melhor música, 24 horas por dia."}
        </p>
        
        {/* Radio Slogan / Short Desc */}
        {config.description && (
            <div className="max-w-2xl mx-auto p-6 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 animate-in slide-in-from-bottom-5 fade-in duration-1000 delay-300">
                <p className="text-sm md:text-base text-gray-300 italic leading-relaxed">
                    "{config.description}"
                </p>
            </div>
        )}
    </div>
  );

  return (
    <div className="relative w-full h-full bg-gray-900 text-white font-sans overflow-hidden flex flex-col">
      <LoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onLogin={handleAdminSubmit} />

      {/* LOCUTOR LOGIN MODAL */}
      {isLocutorLoginOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <button 
                    onClick={() => setIsLocutorLoginOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-blue-500">
                        <MicIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Área do Locutor</h3>
                    <p className="text-sm text-gray-400 text-center">Digite sua chave de acesso pessoal para entrar no estúdio.</p>
                </div>

                <form onSubmit={handleLocutorSubmit} className="flex flex-col gap-4">
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Ex: dj-x8s9a1"
                        value={locutorKey}
                        onChange={(e) => setLocutorKey(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-center tracking-widest uppercase font-mono"
                    />
                    
                    <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-900/20"
                    >
                        ACESSAR ESTÚDIO
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* VOTING MODAL */}
      {isVotingOpen && selectedVoteSong && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <button onClick={() => setIsVotingOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XMarkIcon className="w-5 h-5"/></button>
                
                {voteSuccess ? (
                    <div className="flex flex-col items-center gap-4 py-8 animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white"><CheckIcon className="w-8 h-8" /></div>
                        <h3 className="text-xl font-bold text-white">Voto Confirmado!</h3>
                        <p className="text-sm text-gray-400">Obrigado por participar.</p>
                    </div>
                ) : (
                    <form onSubmit={submitVote} className="flex flex-col gap-4">
                        <div className="text-center mb-2">
                            <h3 className="text-xl font-bold text-white">Votar em "{selectedVoteSong.title}"</h3>
                            <p className="text-sm text-gray-400">Para computar seu voto, preencha abaixo:</p>
                        </div>
                        
                        <input type="text" required placeholder="Seu Nome" value={voterName} onChange={e => setVoterName(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500" />
                        <input type="email" required placeholder="Seu Email" value={voterEmail} onChange={e => setVoterEmail(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500" />
                        
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition shadow-lg">CONFIRMAR VOTO</button>
                    </form>
                )}
            </div>
        </div>
      )}

      {/* 1. BACKGROUND LAYER - IMAGE + GRADIENT */}
      <div className="absolute inset-0 z-0 fixed">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out transform scale-105"
            style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1571266028243-3716950639dd?q=80&w=2070&auto=format&fit=crop')",
                opacity: 0.4
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-black/30 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black"></div>
      </div>

      {/* 2. BACKGROUND LAYER - FULL SCREEN EQUALIZER */}
      <div className="absolute inset-0 z-0 flex items-end justify-center pointer-events-none px-2 pb-0 opacity-40 mix-blend-overlay fixed">
        {[...Array(40)].map((_, i) => (
            <div 
                key={i} 
                className={`flex-1 bg-gradient-to-t ${colors.gradient} mx-[2px] rounded-t-sm ${colors.shadow}`}
                style={{
                    height: isPlaying 
                      ? `${10 + Math.random() * 50}%` 
                      : '2%',
                    transition: 'height 0.2s ease-in-out',
                    animation: isPlaying 
                      ? `pulse-audio ${0.4 + Math.random() * 0.5}s ease-in-out infinite` 
                      : 'none',
                    animationDelay: `${Math.random()}s`
                }}
            ></div>
        ))}
      </div>

      {/* 3. NAVBAR (Glass Effect) */}
      <nav className="absolute top-0 w-full z-50 border-b border-white/5 backdrop-blur-sm fixed">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => isOnePage ? scrollToSection('home') : setActiveTab('home')}>
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt={config.name} className="h-20 w-auto object-contain drop-shadow-xl hover:scale-105 transition" />
                ) : (
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-lg ${colors.bg} ${colors.shadow}`}>
                            <MusicIcon className={`w-7 h-7 ${config.theme === 'white' ? 'text-black' : 'text-white'}`} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none text-white drop-shadow-md">
                                {config.name}
                            </h1>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Logic: Template 1 (Tabs) vs Template 2 (Scroll Anchors) */}
            <div className="flex items-center gap-2 md:gap-10 text-xs md:text-base font-bold uppercase tracking-wide md:tracking-widest text-gray-300">
                <button 
                    onClick={() => isOnePage ? scrollToSection('home') : setActiveTab('home')} 
                    className={`hover:text-white transition-all hover:scale-105 ${!isOnePage && activeTab === 'home' ? `text-white border-b-2 ${colors.border}` : ''}`}
                >Home</button>
                
                <button 
                    onClick={() => isOnePage ? scrollToSection('top10') : setActiveTab('top10')} 
                    className={`hover:text-white transition-all hover:scale-105 ${!isOnePage && activeTab === 'top10' ? `text-white border-b-2 ${colors.border}` : ''}`}
                >Top 10</button>
                
                <button 
                    onClick={() => isOnePage ? scrollToSection('requests') : setActiveTab('requests')} 
                    className={`hover:text-white transition-all hover:scale-105 ${!isOnePage && activeTab === 'requests' ? `text-white border-b-2 ${colors.border}` : ''}`}
                >Pedidos</button>
                
                <button 
                    onClick={() => isOnePage ? scrollToSection('schedule') : setActiveTab('schedule')} 
                    className={`hover:text-white transition-all hover:scale-105 ${!isOnePage && activeTab === 'schedule' ? `text-white border-b-2 ${colors.border}` : ''}`}
                >Programação</button>
                
                <button 
                    onClick={() => isOnePage ? scrollToSection('about') : setActiveTab('about')} 
                    className={`hover:text-white transition-all hover:scale-105 ${!isOnePage && activeTab === 'about' ? `text-white border-b-2 ${colors.border}` : ''}`}
                >Quem Somos</button>
                
                <button 
                    onClick={() => isOnePage ? scrollToSection('contact') : setActiveTab('contact')} 
                    className={`hover:text-white transition-all hover:scale-105 ${!isOnePage && activeTab === 'contact' ? `text-white border-b-2 ${colors.border}` : ''}`}
                >Contato</button>
            </div>

            <div className="flex items-center gap-4">
                 {/* Local Clock */}
                 <div className="hidden md:flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-gray-300">
                     <ClockIcon className="w-4 h-4" />
                     {time}
                 </div>

                 <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-[10px] font-bold shadow-lg shadow-red-900/50 animate-pulse">
                    AO VIVO
                 </div>
            </div>
        </div>
      </nav>

      {/* 4. MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 w-full text-center overflow-y-auto pt-32 scroll-smooth">
        
        {/* TEMPLATE 1: TABS LOGIC */}
        {!isOnePage && (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 pb-20">
                {activeTab === 'home' && (
                    <>
                        {renderHomeHero()}
                        <div className="mt-12 w-full">{renderLoveStory()}</div>
                    </>
                )}
                {activeTab === 'top10' && renderTop10()}
                {activeTab === 'requests' && renderRequests()}
                {activeTab === 'schedule' && renderSchedule()}
                {activeTab === 'about' && renderAbout()}
                {activeTab === 'contact' && renderContact()}
            </div>
        )}

        {/* TEMPLATE 2: ONE PAGE SCROLL LOGIC */}
        {isOnePage && (
            <div className="flex flex-col gap-0 pb-20">
                {renderHomeHero()}
                
                <div className="bg-gradient-to-b from-transparent to-black/40">
                    {renderTop10()}
                </div>
                
                <div className="bg-black/20 border-y border-white/5">
                    {renderRequests()}
                </div>

                <div className="bg-gradient-to-b from-black/40 to-transparent">
                    {renderLoveStory()}
                </div>

                <div className="bg-black/20 border-y border-white/5">
                    {renderSchedule()}
                </div>

                <div className="bg-gradient-to-b from-black/40 to-transparent">
                    {renderAbout()}
                </div>

                <div>
                    {renderContact()}
                </div>
            </div>
        )}

      </main>

      {/* 5. MINIMALIST FOOTER */}
      <footer className="w-full z-20 py-6 text-center text-xs text-gray-500 bg-black/90 backdrop-blur-md border-t border-white/5 flex flex-col items-center gap-2">
        <p>
          <a href="https://agencyl1.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-400 transition">
            Agencyl1.com
          </a> &copy; {new Date().getFullYear()}
        </p>
        
        <div className="flex items-center gap-4 mt-2">
            <button 
                onClick={() => setIsLocutorLoginOpen(true)}
                className="flex items-center gap-1 text-gray-600 hover:text-blue-400 transition"
            >
                <MicIcon className="w-3 h-3" />
                <span>Área do Locutor</span>
            </button>
            <span className="text-gray-800">|</span>
            <button 
                onClick={() => setIsAdminLoginOpen(true)}
                className="flex items-center gap-1 text-gray-600 hover:text-purple-500 transition"
            >
                <LockIcon className="w-3 h-3" />
                <span>Painel Admin</span>
            </button>
        </div>
      </footer>

    </div>
  );
};

export default PublicSite;
