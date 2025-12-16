
import React, { useState, useEffect, useRef } from 'react';
import { signInAnonymously } from "firebase/auth";
import { auth } from "./services/firebaseConfig"; // Importar auth
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlaylistManager from './components/PlaylistManager';
import LibraryManager from './components/LibraryManager';
import TeamManager from './components/TeamManager';
import ScheduleManager from './components/ScheduleManager';
import StudioConsole from './components/StudioConsole';
import Player from './components/Player';
import PublicSite from './components/PublicSite';
import SettingsManager from './components/SettingsManager';
import VotingManager from './components/VotingManager';
import MessagesManager from './components/MessagesManager';
import GuestInterface from './components/GuestInterface';
import { Song, Playlist, ViewState, DJ, ScheduleItem, AutoDJSettings, PlaylistType, RadioStationConfig, Vote, InboxMessage } from './types';

// Importação dos serviços de Banco de Dados
import { 
  subscribeToPlaylists, 
  subscribeToDJs, 
  subscribeToSchedule, 
  subscribeToSettings, 
  subscribeToVotes, 
  subscribeToMessages, 
  savePlaylist,
  deletePlaylistDoc,
  saveDJ,
  deleteDJDoc,
  saveScheduleItem,
  deleteScheduleItemDoc,
  saveStationConfig,
  saveAutoDJSettings,
  addSongsToPlaylistDoc,
  saveVote,
  saveMessage, 
  toggleMessageRead, 
  deleteMessage,
  saveBroadcastState,
  subscribeToBroadcast,
  getBroadcastState,
  BroadcastState
} from './services/dbService';

// Importar serviço de R2
import { createFolderInR2, listFilesFromR2 } from './services/storageService';

// Helper for safe ID generation
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generateAccessKey = () => {
    return 'dj-' + Math.random().toString(36).substr(2, 6);
};

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('public_site');
  const [userRole, setUserRole] = useState<'public' | 'admin' | 'locutor'>('public');
  const [currentUser, setCurrentUser] = useState<DJ | null>(null);
  const [guestMode, setGuestMode] = useState<{ active: boolean; stationId: string | null }>({ active: false, stationId: null });

  // --- DATA STATE (Real-time from Firebase) ---
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]); 
  const [messages, setMessages] = useState<InboxMessage[]>([]); 
  
  const [stationConfig, setStationConfig] = useState<RadioStationConfig>({
      name: "RadioTocai",
      description: "A melhor música, 24 horas por dia.",
      aboutUsText: "Rádio online moderna.",
      logoUrl: null,
      theme: 'purple',
      timezone: 'America/Sao_Paulo',
      contact: { address: '', city: '', phone: '', whatsapp: '', email: '' }
  });

  const [autoDJSettings, setAutoDJSettings] = useState<AutoDJSettings>({
      jingleInterval: 3, enableJingles: true,
      commercialInterval: 6, enableCommercials: true,
      timeAnnouncementInterval: 5, enableTimeAnnouncement: true
  });

  // --- BROADCAST SYNC STATE ---
  const [isBroadcastMaster, setIsBroadcastMaster] = useState(false); // Admin/AutoDJ controla o broadcast
  const [hasSyncedOnLoad, setHasSyncedOnLoad] = useState(false); // Sincronizou ao carregar?
  const isWaitingForSync = useRef(false); // Esperando próxima música do Firebase?

  // --- AUTHENTICATION & FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    // 1. Check for Guest Mode in URL (?guest=station-id) FIRST
    const params = new URLSearchParams(window.location.search);
    const guestStationId = params.get('guest');
    
    if (guestStationId) {
        console.log("Guest Mode Detected for Station:", guestStationId);
        setGuestMode({ active: true, stationId: guestStationId });
        return; // Stop loading main app logic if guest
    }

    const initApp = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error: any) {
            console.error("Erro no login anônimo:", error);
        }

        const unsubPlaylists = subscribeToPlaylists((data) => {
            setPlaylists(data);
            const defaults = [
              { id: 'jingles-default', name: 'Vinhetas da Rádio', type: 'jingle', kind: 'storage', songs: [], ownerId: 'station' },
              { id: 'commercials-default', name: 'Comerciais & Ads', type: 'commercial', kind: 'storage', songs: [], ownerId: 'station' },
              { id: 'backup-playlist-default', name: 'Lista de Backup (Segurança)', type: 'music', kind: 'storage', songs: [], ownerId: 'station' },
              { id: 'top10-default', name: 'Músicas para Votação (Top 10)', type: 'music', kind: 'playlist', songs: [], ownerId: 'station', description: 'Adicione aqui as músicas que aparecerão para votação no site.' }
            ];
            const missingDefaults = defaults.filter(def => !data.some(p => p.id === def.id));
            if (missingDefaults.length > 0) {
                missingDefaults.forEach((p: any) => {
                    savePlaylist(p).catch(e => console.error("Erro ao criar default:", e));
                });
            }
        });

        const unsubDJs = subscribeToDJs((data) => {
            if (data.length === 0) {
                saveDJ({
                    id: 'admin-1', name: 'Admin Master', role: 'Admin', status: 'live',
                    accessKey: 'admin-key-master', streamUrl: 'https://radiotocai.com/studio/admin', avatarColor: '#7c3aed'
                });
            } else {
                setDjs(data);
            }
        });

        const unsubSchedule = subscribeToSchedule(setSchedule);
        const unsubVotes = subscribeToVotes(setVotes);
        const unsubMessages = subscribeToMessages(setMessages);
        const unsubSettings = subscribeToSettings(
            (remoteConfig) => setStationConfig(prev => ({ ...prev, ...remoteConfig })),
            (remoteAutoDJ) => setAutoDJSettings(prev => ({ ...prev, ...remoteAutoDJ }))
        );

        return () => {
            unsubPlaylists();
            unsubDJs();
            unsubSchedule();
            unsubVotes();
            unsubMessages();
            unsubSettings();
        };
    };
    initApp();
  }, []);

  // --- AUDIO ENGINE ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isTalkOver, setIsTalkOver] = useState(false);
  
  // --- KEYBOARD SHORTCUTS FOR VOLUME ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (guestMode.active) return;
        // Ignora se estiver digitando em um input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setVolume(prev => Math.min(1, prev + 0.05));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setVolume(prev => Math.max(0, prev - 0.05));
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guestMode]);

  // --- PLAYBACK QUEUES ---
  const [playerQueue, setPlayerQueue] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [studioQueue, setStudioQueue] = useState<Song[]>([]);
  
  const [isAutoDJ, setIsAutoDJ] = useState(true);
  const [songsPlayed, setSongsPlayed] = useState(0);
  const [songHistory, setSongHistory] = useState<Song[]>([]);
  
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);

  const jinglePlaylist = playlists.find(p => p.type === 'jingle' && p.ownerId === 'station');
  const commercialPlaylist = playlists.find(p => p.type === 'commercial' && p.ownerId === 'station');
  const top10Playlist = playlists.find(p => p.id === 'top10-default') || { id: 'top10-default', name: 'Top 10', songs: [], type: 'music' } as Playlist;

  const currentSong = currentSongIndex >= 0 && currentSongIndex < playerQueue.length ? playerQueue[currentSongIndex] : null;
  const nextSong = currentSongIndex >= 0 && currentSongIndex < playerQueue.length - 1 ? playerQueue[currentSongIndex + 1] : (isAutoDJ && playerQueue.length > 0 ? playerQueue[0] : null);

  // ===========================================
  // SINCRONIZAÇÃO SIMPLES E DEFINITIVA
  // ===========================================
  
  // Função para sincronizar com o broadcast do Firebase
  const syncWithBroadcast = async () => {
    if (isBroadcastMaster) return; // Admin não sincroniza, ele controla
    
    console.log('[SYNC] Buscando estado do broadcast...');
    const state = await getBroadcastState();
    
    if (!state || !state.currentSong) {
      console.log('[SYNC] Nenhum broadcast ativo');
      return;
    }
    
    // Calcula quanto tempo passou desde que a música começou
    const timeSinceStart = (Date.now() - state.startedAt) / 1000;
    console.log(`[SYNC] Música: ${state.currentSong.title}, Tempo passado: ${timeSinceStart.toFixed(1)}s`);
    
    // Atualiza a fila e índice
    setPlayerQueue(state.queue);
    setCurrentSongIndex(state.currentIndex);
    
    // Carrega e pula para o tempo correto
    if (audioRef.current) {
      audioRef.current.src = state.currentSong.url;
      audioRef.current.load();
      
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          const audioDuration = audioRef.current.duration || 0;
          
          // Se o tempo passado for menor que a duração, pula para esse ponto
          if (timeSinceStart < audioDuration && timeSinceStart > 0) {
            audioRef.current.currentTime = timeSinceStart;
            console.log(`[SYNC] Pulando para ${timeSinceStart.toFixed(1)}s de ${audioDuration.toFixed(1)}s`);
          }
          
          // Toca automaticamente
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            console.log('[SYNC] Tocando!');
          }).catch(e => {
            console.error('[SYNC] Autoplay bloqueado:', e);
            setIsPlaying(false);
          });
        }
      };
    }
    
    setHasSyncedOnLoad(true);
  };

  // Sincroniza automaticamente quando a página carrega (para ouvintes públicos)
  useEffect(() => {
    if (userRole === 'public' && !hasSyncedOnLoad && !isBroadcastMaster) {
      // Pequeno delay para garantir que o Firebase está conectado
      const timer = setTimeout(() => {
        syncWithBroadcast();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userRole, hasSyncedOnLoad, isBroadcastMaster]);

  // --- AUDIO LOGIC (só para admin/master) ---
  useEffect(() => {
    // Para admin: carrega a música quando muda
    if (isBroadcastMaster && currentSong && audioRef.current) {
      const currentSrc = audioRef.current.src;
      if (!currentSrc.endsWith(currentSong.url) && currentSong.url !== currentSrc) {
          audioRef.current.src = currentSong.url;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
              console.error("Autoplay prevented:", e);
              setIsPlaying(false);
          });
      } 
    }
  }, [currentSong, isBroadcastMaster]);

  useEffect(() => {
      if (audioRef.current) {
          if (isPlaying && audioRef.current.paused) audioRef.current.play().catch(e => console.error(e));
          else if (!isPlaying && !audioRef.current.paused) audioRef.current.pause();
      }
  }, [isPlaying]);

  const togglePlay = async () => { 
    if (!currentSong && !isBroadcastMaster) {
      // Se não tem música e é ouvinte, sincroniza
      await syncWithBroadcast();
      return;
    }
    
    setIsPlaying(!isPlaying); 
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  // Quando a música termina
  const handleEnded = async () => {
    // Se for admin/master, avança normalmente
    if (isBroadcastMaster) {
      setTimeout(() => { playNext(); }, 500);
      return;
    }
    
    // Para ouvintes: busca o estado atual do Firebase e sincroniza
    console.log('[SYNC] Música terminou - sincronizando com broadcast...');
    isWaitingForSync.current = true;
    await syncWithBroadcast();
    isWaitingForSync.current = false;
  };

  // --- DB WRAPPERS ---
  const createPlaylist = async (name: string, type: PlaylistType = 'music', ownerId: string = 'station', kind: 'storage' | 'playlist' = 'playlist') => {
    const newPlaylist: Playlist = { id: generateId(), name, type, ownerId, kind, songs: [] };
    if (kind === 'storage') createFolderInR2(name).catch(console.error);
    await savePlaylist(newPlaylist);
  };
  const deletePlaylist = (id: string) => { deletePlaylistDoc(id); };
  const addSongToPlaylist = (playlistId: string, song: Song) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) savePlaylist({ ...playlist, songs: [...playlist.songs, song] });
  };
  const handleAddSongs = async (playlistId: string, songs: Song[]) => { await addSongsToPlaylistDoc(playlistId, songs); };
  
  const handleSyncFolder = async (playlistId: string) => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist || !confirm(`Escanear pasta "${playlist.name}" no R2?`)) return;
      const r2Songs = await listFilesFromR2(playlist.name);
      if (r2Songs.length === 0) { alert("Nenhum arquivo encontrado no R2."); return; }
      const currentUrls = new Set(playlist.songs.map(s => s.url));
      const newSongs = r2Songs.filter(s => !currentUrls.has(s.url));
      if (newSongs.length > 0) { await addSongsToPlaylistDoc(playlistId, newSongs); alert(`${newSongs.length} arquivos recuperados.`); } 
      else { alert("Pasta já sincronizada."); }
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) savePlaylist({ ...playlist, songs: playlist.songs.filter(s => s.id !== songId) });
  };

  const handleUpdateConfig = (newConfig: RadioStationConfig) => { setStationConfig(newConfig); saveStationConfig(newConfig); };
  const handleUpdateAutoDJ = (newSettings: AutoDJSettings) => { setAutoDJSettings(newSettings); saveAutoDJSettings(newSettings); };
  const handleRegisterVote = async (songId: string, songTitle: string, artist: string, name: string, email: string) => {
      await saveVote({ songId, songTitle, artist, voterName: name, voterEmail: email, timestamp: new Date().toISOString() });
  };
  const handleSendMessage = async (msg: Omit<InboxMessage, 'id' | 'timestamp' | 'read'>) => {
      await saveMessage({ ...msg, timestamp: new Date().toISOString(), read: false });
  };

  // --- MIXER LOGIC (só para admin/master) ---
  const playPlaylistMixed = (playlistId: string, silent: boolean = false) => {
    if (!isBroadcastMaster && userRole !== 'admin') {
      console.log('[SYNC] Ouvinte não pode iniciar playlist');
      return;
    }
    
    const targetPlaylist = playlists.find(p => p.id === playlistId);
    if (!targetPlaylist || targetPlaylist.songs.length === 0) {
      if(!silent) console.warn("AutoDJ: Tentou tocar playlist vazia.", playlistId);
      return;
    }
    const validSongs = targetPlaylist.songs.filter(s => s.url);
    const shuffledSongs = [...validSongs].sort(() => Math.random() - 0.5);

    console.log(`[AutoDJ] Iniciando playlist: ${targetPlaylist.name}`);
    setPlayerQueue(shuffledSongs);
    setCurrentSongIndex(0);
    setIsAutoDJ(true);
    setSongsPlayed(0);
    setIsPlaying(true);
    
    // Salva no Firebase para todos os ouvintes
    if (shuffledSongs.length > 0) {
      saveBroadcastState({
        currentSong: shuffledSongs[0],
        queue: shuffledSongs,
        currentIndex: 0,
        isPlaying: true,
        startedAt: Date.now(),
        currentTime: 0,
        updatedAt: Date.now()
      });
    }
  };

  // --- SCHEDULER & AUTODJ ENGINE (só para admin/master) ---
  const checkAndEnforceSchedule = (forceUpdate = false) => {
      if (!isBroadcastMaster && userRole !== 'admin') return; // Só admin controla
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const activeSchedule = schedule.find(item => {
          if (!item.isActive) return false;
          if (!item.days.includes(currentDay)) return false;
          // ScheduleItem usa 'time' no formato "HH:mm"
          const [scheduleH, scheduleM] = item.time.split(':').map(Number);
          const scheduleMin = scheduleH * 60 + scheduleM;
          // Considera ativo por 1 hora a partir do horário agendado
          return currentMinutes >= scheduleMin && currentMinutes < scheduleMin + 60;
      });

      if (activeSchedule) {
          if (activeSchedule.id !== currentScheduleId || forceUpdate) {
              console.log(`[AutoDJ] Aplicando agendamento: ${activeSchedule.playlistId}`);
              setCurrentScheduleId(activeSchedule.id);
              playPlaylistMixed(activeSchedule.playlistId, true);
          }
      } else {
          if (currentScheduleId !== null || forceUpdate || playerQueue.length === 0) {
              setCurrentScheduleId(null);
              
              const musicPlaylists = playlists.filter(p => p.type === 'music' && p.songs.length > 0 && p.id !== 'backup-playlist-default');
              if (musicPlaylists.length > 0) {
                  const randomPl = musicPlaylists[Math.floor(Math.random() * musicPlaylists.length)];
                  playPlaylistMixed(randomPl.id, true);
              } else {
                  const backup = playlists.find(p => p.id === 'backup-playlist-default');
                  if (backup && backup.songs.length > 0) playPlaylistMixed(backup.id, true);
              }
          }
      }
  };

  useEffect(() => {
    // AutoDJ só roda para admin/master
    if (!isAutoDJ || !isBroadcastMaster) return;
    const timer = setInterval(() => checkAndEnforceSchedule(false), 10000);
    return () => clearInterval(timer);
  }, [isAutoDJ, schedule, playlists, currentScheduleId, playerQueue, isBroadcastMaster]);

  const handleToggleAutoDJ = () => {
      if (!isBroadcastMaster) return; // Só admin pode controlar
      
      const newState = !isAutoDJ;
      setIsAutoDJ(newState);
      if (newState) {
          console.log("AutoDJ Ativado Manualmente.");
          checkAndEnforceSchedule(true);
      } else {
          setIsPlaying(false);
          setCurrentScheduleId(null);
      }
  };

  const playNext = () => {
    if (!isBroadcastMaster) return; // Só admin avança
    
    if (playerQueue.length === 0) {
        if(isAutoDJ) {
            checkAndEnforceSchedule(false);
        } else {
            setIsPlaying(false);
        }
        return;
    }

    let nextIndex = -1;
    if (currentSongIndex < playerQueue.length - 1) {
       nextIndex = currentSongIndex + 1;
    } else if (isAutoDJ) {
       nextIndex = 0;
    }

    if (nextIndex !== -1) {
        const justFinishedSong = playerQueue[currentSongIndex];
        if (isAutoDJ && justFinishedSong && !justFinishedSong.isJingle) {
            const newCount = songsPlayed + 1;
            setSongsPlayed(newCount);
            const newQueue = [...playerQueue];
            let insertionOffset = 0;

            if (autoDJSettings.enableTimeAnnouncement && newCount % autoDJSettings.timeAnnouncementInterval === 0) announceTime();

            if (autoDJSettings.enableCommercials && newCount % autoDJSettings.commercialInterval === 0 && commercialPlaylist && commercialPlaylist.songs.length > 0) {
                 const randomAd = commercialPlaylist.songs[Math.floor(Math.random() * commercialPlaylist.songs.length)];
                 newQueue.splice(nextIndex + insertionOffset, 0, { ...randomAd, id: `auto-ad-${Date.now()}`, isJingle: true });
                 insertionOffset++;
            }

            if (autoDJSettings.enableJingles && newCount % autoDJSettings.jingleInterval === 0 && jinglePlaylist && jinglePlaylist.songs.length > 0) {
                 const randomJingle = jinglePlaylist.songs[Math.floor(Math.random() * jinglePlaylist.songs.length)];
                 newQueue.splice(nextIndex + insertionOffset, 0, { ...randomJingle, id: `auto-jingle-${Date.now()}`, isJingle: true });
                 insertionOffset++;
            }
            if (insertionOffset > 0) setPlayerQueue(newQueue);
        }
        
        const nextSongToPlay = playerQueue[nextIndex];
        setCurrentSongIndex(nextIndex);
        setIsPlaying(true);
        
        // Salva no Firebase para todos os ouvintes
        if (nextSongToPlay) {
          saveBroadcastState({
            currentSong: nextSongToPlay,
            queue: playerQueue,
            currentIndex: nextIndex,
            isPlaying: true,
            startedAt: Date.now(),
            currentTime: 0,
            updatedAt: Date.now()
          });
        }
    } else {
        setIsPlaying(false);
    }
  };

  const announceTime = () => {
     const now = new Date();
     const utterance = new SpeechSynthesisUtterance(`Agora são ${now.getHours()} horas e ${now.getMinutes()} minutos.`);
     utterance.lang = 'pt-BR';
     window.speechSynthesis.speak(utterance);
  };

  // Inicia AutoDJ automaticamente quando admin loga
  useEffect(() => {
      if (isBroadcastMaster && isAutoDJ && playlists.length > 0 && playerQueue.length === 0) {
          checkAndEnforceSchedule(false);
      }
  }, [playlists, isBroadcastMaster, isAutoDJ]);

  const handleAddToStudioQueue = (song: Song) => { setStudioQueue(prev => [...prev, song]); };
  const handleRemoveFromStudioQueue = (id: string) => { setStudioQueue(prev => prev.filter(s => s.id !== id)); };
  
  const handleReorderQueue = (from: number, to: number) => {
      if (isAutoDJ) {
          const newQueue = [...studioQueue];
          const [moved] = newQueue.splice(from, 1);
          newQueue.splice(to, 0, moved);
          setStudioQueue(newQueue);
      } else {
          const currentPlayingId = playerQueue[currentSongIndex]?.id;
          const newQueue = [...playerQueue];
          const [moved] = newQueue.splice(from, 1);
          newQueue.splice(to, 0, moved);
          setPlayerQueue(newQueue);
          const newIndex = newQueue.findIndex(s => s.id === currentPlayingId);
          if (newIndex !== -1) setCurrentSongIndex(newIndex);
      }
  };

  const handleLoadDJProfile = (djId: string): boolean => {
      const dj = djs.find(d => d.id === djId);
      if (dj) {
          setCurrentUser(dj);
          const djPlaylists = playlists.filter(p => p.ownerId === djId);
          if (djPlaylists.length > 0) {
              const mainPlaylist = djPlaylists[0];
              setStudioQueue(mainPlaylist.songs);
          }
          return true;
      }
      return false;
  };

  const handleLoadPlaylistToStudio = (playlistId: string) => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) setStudioQueue(playlist.songs);
  };

  const handlePlaySpecificSong = (index: number) => {
      if (!isBroadcastMaster) return;
      if (index < 0 || index >= playerQueue.length) return;
      
      const song = playerQueue[index];
      setCurrentSongIndex(index);
      setIsPlaying(true);
      
      // Salva no Firebase
      saveBroadcastState({
        currentSong: song,
        queue: playerQueue,
        currentIndex: index,
        isPlaying: true,
        startedAt: Date.now(),
        currentTime: 0,
        updatedAt: Date.now()
      });
  };

  const handleGoLive = () => {
      if (!isBroadcastMaster) return;
      
      if (studioQueue.length === 0) {
          alert("Adicione músicas à fila do estúdio antes de ir ao ar!");
          return;
      }
      setIsAutoDJ(false);
      setPlayerQueue(studioQueue);
      setCurrentSongIndex(0);
      setIsPlaying(true);
      
      saveBroadcastState({
        currentSong: studioQueue[0],
        queue: studioQueue,
        currentIndex: 0,
        isPlaying: true,
        startedAt: Date.now(),
        currentTime: 0,
        updatedAt: Date.now()
      });
  };

  const handleGoOffAir = () => {
      if (!isBroadcastMaster) return;
      
      setIsAutoDJ(true);
      setIsTalkOver(false);
      setStudioQueue([]);
      console.log("Saindo do ar. Voltando para Automação Imediata...");
      checkAndEnforceSchedule(true);
  };

  const playInterruptionSong = (song: Song) => {
      if (!isBroadcastMaster) return;
      
      const newQueue = isAutoDJ ? [song, ...playerQueue] : [...playerQueue];
      if(!isAutoDJ) newQueue.splice(currentSongIndex + 1, 0, song);
      setPlayerQueue(newQueue);
      if(isAutoDJ) setCurrentSongIndex(0); else setCurrentSongIndex(currentSongIndex + 1);
      setIsPlaying(true);
      
      saveBroadcastState({
        currentSong: song,
        queue: newQueue,
        currentIndex: isAutoDJ ? 0 : currentSongIndex + 1,
        isPlaying: true,
        startedAt: Date.now(),
        currentTime: 0,
        updatedAt: Date.now()
      });
  };
  
  const playPrev = () => { 
    if (!isBroadcastMaster) return;
    if (playerQueue.length > 0 && currentSongIndex > 0) {
      const prevIndex = currentSongIndex - 1;
      setCurrentSongIndex(prevIndex);
      
      saveBroadcastState({
        currentSong: playerQueue[prevIndex],
        queue: playerQueue,
        currentIndex: prevIndex,
        isPlaying: true,
        startedAt: Date.now(),
        currentTime: 0,
        updatedAt: Date.now()
      });
    }
  };
  
  const getThemeAccentColor = () => {
      switch(stationConfig.theme) {
          case 'blue': return 'text-blue-400';
          case 'red': return 'text-red-400';
          case 'white': return 'text-white';
          default: return 'text-purple-400';
      }
  };

  const handleExportBackup = () => { /* ... */ };
  const handleImportBackup = (file: File) => { /* ... */ };

  // --- LOGIN HANDLING ---
  const handleAdminLogin = () => {
      setUserRole('admin');
      setCurrentView('dashboard');
      setIsBroadcastMaster(true); // Admin controla o broadcast
      setHasSyncedOnLoad(false); // Reset sync flag
  };

  const handleLocutorLogin = (accessKey: string) => {
      const foundDj = djs.find(d => d.accessKey === accessKey);
      if (foundDj) {
          setCurrentUser(foundDj);
          setUserRole('locutor');
          setCurrentView('studio');
          setIsBroadcastMaster(true); // Locutor também controla
          setHasSyncedOnLoad(false);
          handleLoadDJProfile(foundDj.id);
      } else {
          alert("Chave de acesso inválida ou locutor não encontrado.");
      }
  };

  const handleLogout = () => {
      setUserRole('public');
      setCurrentView('public_site');
      setCurrentUser(null);
      setIsBroadcastMaster(false);
      setHasSyncedOnLoad(false); // Vai sincronizar de novo como ouvinte
  };

  const renderContent = () => {
    switch (currentView) {
        case 'messages': return <MessagesManager messages={messages} onMarkAsRead={toggleMessageRead} onDeleteMessage={deleteMessage} />;
        case 'voting': return <VotingManager votes={votes} top10Playlist={top10Playlist} onCreatePlaylist={(n) => createPlaylist(n, 'music', 'station', 'playlist')} onDeletePlaylist={deletePlaylist} onAddSongToPlaylist={addSongToPlaylist} onAddSongsToPlaylist={handleAddSongs} onRemoveSongFromPlaylist={removeSongFromPlaylist} onPlayPlaylistMixed={(id) => playPlaylistMixed(id, false)} playlists={playlists} />;
        case 'acervo': return <LibraryManager playlists={playlists.filter(p => p.kind === 'storage' && p.type === 'music')} onCreateFolder={(n) => createPlaylist(n, 'music', 'station', 'storage')} onDeleteFolder={deletePlaylist} onAddSongToFolder={addSongToPlaylist} onAddSongsToFolder={handleAddSongs} onRemoveSongFromFolder={removeSongFromPlaylist} onSyncFolder={handleSyncFolder} />;
        case 'library': return <PlaylistManager playlists={playlists.filter(p => ((p.kind === 'playlist' || !p.kind) && p.type === 'music') || p.id === 'backup-playlist-default')} allPlaylists={playlists} onCreatePlaylist={(n) => createPlaylist(n, 'music', 'station', 'playlist')} onDeletePlaylist={deletePlaylist} onAddSongToPlaylist={addSongToPlaylist} onAddSongsToPlaylist={handleAddSongs} onRemoveSongFromPlaylist={removeSongFromPlaylist} onPlayPlaylistMixed={(id) => playPlaylistMixed(id, false)} isJingleMode={false} />;
        case 'jingles': return <PlaylistManager playlists={playlists.filter(p => (p.type === 'jingle' || p.type === 'commercial') && p.ownerId === 'station')} allPlaylists={playlists} onCreatePlaylist={(n, t) => createPlaylist(n, t || 'jingle', 'station', 'storage')} onDeletePlaylist={deletePlaylist} onAddSongToPlaylist={addSongToPlaylist} onAddSongsToPlaylist={handleAddSongs} onRemoveSongFromPlaylist={removeSongFromPlaylist} onPlayPlaylistMixed={(id) => playPlaylistMixed(id, false)} isJingleMode={true} autoDJSettings={autoDJSettings} onUpdateSettings={handleUpdateAutoDJ} stationMode={true} lockCreation={true} />;
        case 'team': return <TeamManager djs={djs} onAddDJ={(n, r) => saveDJ({id: generateId(), name: n, role: r, status: 'offline', accessKey: generateAccessKey(), streamUrl: '', avatarColor: '#555'})} onUpdateDJ={saveDJ} onRemoveDJ={deleteDJDoc} playlists={playlists} onCreatePlaylist={(n, t, o) => createPlaylist(n, t, o, 'playlist')} onDeletePlaylist={deletePlaylist} onAddSongToPlaylist={addSongToPlaylist} onAddSongsToPlaylist={handleAddSongs} onRemoveSongFromPlaylist={removeSongFromPlaylist} onPlayPlaylistMixed={playPlaylistMixed} />;
        case 'schedule': return <ScheduleManager schedule={schedule} playlists={playlists} onAddSchedule={(i) => saveScheduleItem({ ...i, id: generateId() })} onRemoveSchedule={deleteScheduleItemDoc} onToggleSchedule={(id) => { const item = schedule.find(s => s.id === id); if (item) saveScheduleItem({ ...item, isActive: !item.isActive }); }} />;
        case 'studio': return <StudioConsole 
            playlists={playlists} djs={djs} jinglePlaylist={jinglePlaylist} theme={stationConfig.theme} accentColor={getThemeAccentColor()} 
            onAddJingle={(s) => jinglePlaylist && addSongToPlaylist(jinglePlaylist.id, s)} onForcePlay={playInterruptionSong} 
            isAutoDJEnabled={isAutoDJ} isTalkOver={isTalkOver} onToggleTalkOver={() => setIsTalkOver(!isTalkOver)} 
            currentSong={currentSong} queue={studioQueue} playingQueue={playerQueue} currentSongIndex={currentSongIndex} 
            onQueueAdd={handleAddToStudioQueue} onQueueRemove={handleRemoveFromStudioQueue} 
            onQueueReorder={handleReorderQueue} 
            onLoadProfile={handleLoadDJProfile} onGoLive={handleGoLive} onGoOffAir={handleGoOffAir} onLoadPlaylist={handleLoadPlaylistToStudio} 
            onMasterVolumeChange={(val) => setVolume(val)} 
            onTogglePlayback={(shouldPlay) => setIsPlaying(shouldPlay)}
            onPlaySpecificSong={handlePlaySpecificSong}
        />;
        case 'settings': return <SettingsManager config={stationConfig} onUpdateConfig={handleUpdateConfig} onExportBackup={handleExportBackup} onImportBackup={handleImportBackup} />;
        case 'dashboard': default: return <Dashboard currentSong={currentSong} nextSong={nextSong} isAutoDJ={isAutoDJ} onToggleAutoDJ={handleToggleAutoDJ} />;
    }
  };

  if (guestMode.active && guestMode.stationId) return <GuestInterface stationId={guestMode.stationId} />;

  return (
    <div className="h-screen bg-black text-white selection:bg-purple-500/30 flex overflow-hidden font-sans">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} crossOrigin="anonymous" />
      {currentView === 'public_site' ? (
        <PublicSite 
             currentSong={currentSong} nextSong={nextSong} history={songHistory} isPlaying={isPlaying}
             onAdminLogin={handleAdminLogin}
             onLocutorLogin={handleLocutorLogin}
             onTogglePlay={togglePlay} config={stationConfig}
             top10Playlist={top10Playlist} votes={votes} onVote={handleRegisterVote} onSendMessage={handleSendMessage}
        />
      ) : (
        <>
          <Sidebar currentView={currentView} onChangeView={setCurrentView} currentTheme={stationConfig.theme} userRole={userRole} />
          <div className="flex-1 flex flex-col relative">
            <main className="flex-1 overflow-hidden bg-gray-950 pb-[100px]"> 
              {renderContent()}
            </main>
            <Player 
              audioRef={audioRef} currentSong={currentSong} playlist={playerQueue} isPlaying={isPlaying}
              progress={progress} duration={duration} volume={volume} setVolume={setVolume}
              onSeek={handleSeek} onTogglePlay={togglePlay} onNext={playNext} onPrev={playPrev}
              isAutoDJEnabled={isAutoDJ} toggleAutoDJ={handleToggleAutoDJ} isTalkOver={isTalkOver}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
