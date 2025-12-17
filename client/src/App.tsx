
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from './lib/trpc';
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
  deleteMessage 
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

  // --- UPDATE FAVICON WHEN LOGO CHANGES ---
  useEffect(() => {
    if (stationConfig.logoUrl) {
      // Update favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = stationConfig.logoUrl;

      // Update apple-touch-icon for iOS
      let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleIcon);
      }
      appleIcon.href = stationConfig.logoUrl;
    }
  }, [stationConfig.logoUrl]);

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
  const [pendingScheduleChange, setPendingScheduleChange] = useState<{ scheduleId: string | null; playlistId: string } | null>(null);

  const jinglePlaylist = playlists.find(p => p.type === 'jingle' && p.ownerId === 'station');
  const commercialPlaylist = playlists.find(p => p.type === 'commercial' && p.ownerId === 'station');
  const top10Playlist = playlists.find(p => p.id === 'top10-default') || { id: 'top10-default', name: 'Top 10', songs: [], type: 'music' } as Playlist;

  const currentSong = currentSongIndex >= 0 && currentSongIndex < playerQueue.length ? playerQueue[currentSongIndex] : null;
  const nextSong = currentSongIndex >= 0 && currentSongIndex < playerQueue.length - 1 ? playerQueue[currentSongIndex + 1] : (isAutoDJ && playerQueue.length > 0 ? playerQueue[0] : null);

  // --- RADIO SYNC (Global synchronization with backend) ---
  const allSongs = playlists.flatMap(p => p.songs);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleSync = useCallback((songIndex: number, position: number, playlist: Song[]) => {
    // Only sync if we're in AutoDJ mode and not in guest mode
    if (!isAutoDJ || guestMode.active || currentView !== 'public_site' || isSyncing) {
      return;
    }

    // Prevent sync loops - only sync if enough time has passed
    const now = Date.now();
    if (now - lastSyncTime < 3000) {
      return;
    }

    setIsSyncing(true);

    // Update playlist if different
    if (JSON.stringify(playlist.map(s => s.id)) !== JSON.stringify(playerQueue.map(s => s.id))) {
      console.log('[RadioSync] Updating playlist');
      setPlayerQueue(playlist);
    }

    // Only update song index if significantly different (not just +1 or -1)
    const indexDiff = Math.abs(songIndex - currentSongIndex);
    if (indexDiff > 1 || (indexDiff === 1 && now - lastSyncTime > 10000)) {
      console.log('[RadioSync] Jumping to song', songIndex, 'from', currentSongIndex);
      setCurrentSongIndex(songIndex);
    }

    // Seek to correct position only if very desynchronized
    if (audioRef.current && Math.abs(audioRef.current.currentTime - position) > 5) {
      console.log('[RadioSync] Seeking to position', position, 'from', audioRef.current.currentTime);
      audioRef.current.currentTime = position;
    }

    setLastSyncTime(now);
    setTimeout(() => setIsSyncing(false), 1000);
  }, [isAutoDJ, guestMode.active, currentView, playerQueue, currentSongIndex, lastSyncTime, isSyncing]);

  // Import and use the sync hook
  const { data: radioState } = trpc.radio.getState.useQuery(undefined, {
    enabled: isAutoDJ && !guestMode.active && currentView === 'public_site',
    refetchInterval: 5000,
  });

  // Sync effect
  useEffect(() => {
    if (!radioState || !isAutoDJ || guestMode.active || currentView !== 'public_site') {
      return;
    }

    try {
      const playlistOrder = radioState.playlistOrder ? JSON.parse(radioState.playlistOrder) : [];
      const playlist = playlistOrder
        .map((id: string) => allSongs.find(s => s.id === id))
        .filter((s: Song | undefined): s is Song => s !== undefined);

      if (playlist.length === 0) return;

      // Calculate elapsed time for CURRENT song only
      const now = new Date();
      const songStartTime = new Date(radioState.songStartedAt);
      const elapsedSeconds = Math.floor((now.getTime() - songStartTime.getTime()) / 1000);

      const currentIndex = radioState.currentSongIndex;
      const currentSong = playlist[currentIndex];

      // Only sync if we're within the song duration
      // Don't auto-advance - let the natural player flow handle that
      if (currentSong && currentSong.duration) {
        const currentPosition = Math.min(elapsedSeconds, currentSong.duration - 1);
        handleSync(currentIndex, Math.max(0, currentPosition), playlist);
      } else {
        // No duration info, just sync index
        handleSync(currentIndex, 0, playlist);
      }
    } catch (error) {
      console.error('[RadioSync] Error:', error);
    }
  }, [radioState, isAutoDJ, guestMode.active, currentView, allSongs, handleSync]);

  // --- UPDATE MEDIA SESSION (iOS LOCKSCREEN) ---
  useEffect(() => {
    if (currentSong && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Desconhecido',
        album: stationConfig.name,
        artwork: [
          { src: stationConfig.logoUrl || '/favicon.png', sizes: '96x96', type: 'image/png' },
          { src: stationConfig.logoUrl || '/favicon.png', sizes: '128x128', type: 'image/png' },
          { src: stationConfig.logoUrl || '/favicon.png', sizes: '192x192', type: 'image/png' },
          { src: stationConfig.logoUrl || '/favicon.png', sizes: '256x256', type: 'image/png' },
          { src: stationConfig.logoUrl || '/favicon.png', sizes: '384x384', type: 'image/png' },
          { src: stationConfig.logoUrl || '/favicon.png', sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  }, [currentSong, stationConfig.logoUrl, stationConfig.name]);

  // --- AUDIO LOGIC ---
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const currentSrc = audioRef.current.src;
      if (!currentSrc.endsWith(currentSong.url) && currentSong.url !== currentSrc) {
          audioRef.current.src = currentSong.url;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
              console.error("Autoplay prevented:", e);
              setIsPlaying(false);
          });
      } 
    } else if (!currentSong) {
      setIsPlaying(false);
      setProgress(0);
    }
  }, [currentSong]);

  useEffect(() => {
      if (audioRef.current) {
          if (isPlaying && audioRef.current.paused) audioRef.current.play().catch(e => console.error(e));
          else if (!isPlaying && !audioRef.current.paused) audioRef.current.pause();
      }
  }, [isPlaying]);

  const togglePlay = () => { if (currentSong) setIsPlaying(!isPlaying); };

  // --- AUTO-RESUME AFTER AUDIO INTERRUPTION (Instagram, TikTok, etc.) ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Quando o usuário volta para a aba/app e havia uma música tocando
      if (!document.hidden && currentSong && audioRef.current && audioRef.current.paused && isPlaying) {
        console.log('Retomando reprodução após interrupção...');
        audioRef.current.play().catch(e => console.error('Erro ao retomar:', e));
      }
    };

    const handleAudioInterruption = () => {
      // Quando o áudio é interrompido por outro app
      if (audioRef.current && !audioRef.current.paused) {
        console.log('Áudio interrompido por outro app');
      }
    };

    const handleAudioResume = () => {
      // Tentar retomar quando o áudio fica disponível novamente
      if (currentSong && audioRef.current && audioRef.current.paused && isPlaying) {
        console.log('Áudio disponível novamente, retomando...');
        setTimeout(() => {
          audioRef.current?.play().catch(e => console.error('Erro ao retomar:', e));
        }, 300); // Pequeno delay para garantir que o sistema liberou o áudio
      }
    };

    // Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    if (audioRef.current) {
      audioRef.current.addEventListener('pause', handleAudioInterruption);
      audioRef.current.addEventListener('play', handleAudioResume);
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (audioRef.current) {
        audioRef.current.removeEventListener('pause', handleAudioInterruption);
        audioRef.current.removeEventListener('play', handleAudioResume);
      }
    };
  }, [currentSong, isPlaying]);

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

  const handleEnded = () => {
    // Check if there's a pending schedule change
    if (pendingScheduleChange) {
      console.log('[Schedule] Applying pending schedule change after song ended');
      setCurrentScheduleId(pendingScheduleChange.scheduleId);
      playPlaylistMixed(pendingScheduleChange.playlistId);
      setPendingScheduleChange(null);
    } else {
      setTimeout(() => { playNext(); }, 1000);
    }
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

  // --- MIXER LOGIC (WITH GLOBAL SYNC) ---
  const initPlaylistMutation = trpc.radio.initState.useMutation();
  const updateStateMutation = trpc.radio.updateState.useMutation();

  const playPlaylistMixed = async (playlistId: string, silent: boolean = false) => {
    const targetPlaylist = playlists.find(p => p.id === playlistId);
    if (!targetPlaylist || targetPlaylist.songs.length === 0) {
      if(!silent) console.warn("AutoDJ: Tentou tocar playlist vazia.", playlistId);
      return;
    }
    const validSongs = targetPlaylist.songs.filter(s => s.url);
    
    // Generate shuffled order ONCE and save to backend
    const shuffledSongs = [...validSongs].sort(() => Math.random() - 0.5);
    const playlistOrder = JSON.stringify(shuffledSongs.map(s => s.id));

    console.log(`[AutoDJ] Iniciando playlist: ${targetPlaylist.name}`);
    
    try {
      // Initialize global radio state in backend
      await initPlaylistMutation.mutateAsync({
        playlistId,
        playlistOrder,
      });

      // Set local state (will be synced by useRadioSync)
      setPlayerQueue(shuffledSongs);
      setCurrentSongIndex(0);
      setIsAutoDJ(true);
      setSongsPlayed(0);
      setIsPlaying(true);
    } catch (error) {
      console.error('[AutoDJ] Failed to init playlist:', error);
      // Fallback to local playback if backend fails
      setPlayerQueue(shuffledSongs);
      setCurrentSongIndex(0);
      setIsAutoDJ(true);
      setSongsPlayed(0);
      setIsPlaying(true);
    }
  };

  // --- SCHEDULER & AUTODJ ENGINE ---
  const checkAndEnforceSchedule = (forceUpdate = false) => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todaysSchedule = schedule.filter(item => item.isActive && item.days.includes(currentDay));

      let activeItem: ScheduleItem | null = null;
      let maxTimeVal = -1;

      todaysSchedule.forEach(item => {
          const [h, m] = item.time.split(':').map(Number);
          const itemMinutes = h * 60 + m;

          if (itemMinutes <= currentMinutes && itemMinutes > maxTimeVal) {
              maxTimeVal = itemMinutes;
              activeItem = item;
          }
      });

      if (activeItem) {
          const item = activeItem as ScheduleItem;
          if (forceUpdate || currentScheduleId !== item.id) {
              if (currentSong && isPlaying) {
                  // Schedule change for after current song ends (smooth transition)
                  console.log(`[AutoDJ] Novo horário detectado! Agendando mudança para: ${item.time} (após música atual)`);
                  setPendingScheduleChange({ scheduleId: item.id, playlistId: item.playlistId });
              } else {
                  // No song playing, change immediately
                  console.log(`[AutoDJ] Novo horário detectado! Mudando para: ${item.time}`);
                  setCurrentScheduleId(item.id);
                  playPlaylistMixed(item.playlistId);
              }
          } else if (playerQueue.length === 0 && isAutoDJ) {
              console.log("[AutoDJ] Fila vazia durante programa agendado. Reiniciando lista...");
              playPlaylistMixed(item.playlistId);
          }
      } else {
          if (forceUpdate || currentScheduleId !== null || playerQueue.length === 0) {
              if (currentSong && isPlaying) {
                  // Schedule change for after current song ends
                  console.log("[AutoDJ] Nenhum programa agendado. Agendando Rotação Geral (após música atual)...");
                  const musicPlaylists = playlists.filter(p => p.type === 'music' && p.songs.length > 0 && p.id !== 'backup-playlist-default');
                  if (musicPlaylists.length > 0) {
                      const randomPl = musicPlaylists[Math.floor(Math.random() * musicPlaylists.length)];
                      setPendingScheduleChange({ scheduleId: null, playlistId: randomPl.id });
                  } else {
                      const backup = playlists.find(p => p.id === 'backup-playlist-default');
                      if (backup && backup.songs.length > 0) {
                          setPendingScheduleChange({ scheduleId: null, playlistId: backup.id });
                      }
                  }
              } else {
                  // No song playing, change immediately
                  console.log("[AutoDJ] Nenhum programa agendado agora. Iniciando Rotação Geral...");
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
      }
  };

  useEffect(() => {
    if (!isAutoDJ) return;
    const timer = setInterval(() => checkAndEnforceSchedule(false), 10000);
    return () => clearInterval(timer);
  }, [isAutoDJ, schedule, playlists, currentScheduleId, playerQueue]);

  const handleToggleAutoDJ = () => {
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
        
        // Update backend with new song index (for global sync)
        if (isAutoDJ && !guestMode.active && currentView === 'public_site') {
          updateStateMutation.mutate({
            currentSongIndex: nextIndex,
            songStartedAt: new Date(),
            currentPosition: 0,
            isPlaying: 1,
          });
        }
        
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
        setCurrentSongIndex(nextIndex);
        setIsPlaying(true); 
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

  useEffect(() => {
      if (isAutoDJ && playlists.length > 0 && playerQueue.length === 0) {
          checkAndEnforceSchedule(false);
      }
  }, [playlists]);

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
          if (currentPlayingId) {
              const newIndex = newQueue.findIndex(s => s.id === currentPlayingId);
              if (newIndex !== -1 && newIndex !== currentSongIndex) {
                  setCurrentSongIndex(newIndex);
              }
          }
      }
  };

  const handlePlaySpecificSong = (index: number) => {
      if (isAutoDJ) return;
      setCurrentSongIndex(index);
      setIsPlaying(true);
  };

  const handleLoadDJProfile = (djId: string) => {
      const dj = djs.find(d => d.id === djId);
      if(!dj) return false;
      let targetPlaylist = playlists.find(p => p.ownerId === djId && p.type === 'music');
      if (!targetPlaylist) targetPlaylist = playlists.find(p => p.type === 'music' && p.name.toLowerCase().includes(dj.name.toLowerCase()));
      if (targetPlaylist && targetPlaylist.songs.length > 0) { setStudioQueue(targetPlaylist.songs.map(s => ({...s}))); return true; }
      setStudioQueue([]); return false;
  };
  
  const handleLoadPlaylistToStudio = (playlistId: string) => {
      const selected = playlists.find(p => p.id === playlistId);
      if (selected && selected.songs.length > 0) {
          setStudioQueue(selected.songs.map(s => ({...s}))); 
      } else {
          setStudioQueue([]);
      }
  };

  const handleGoLive = () => {
      setIsAutoDJ(false);
      if (studioQueue.length > 0) {
          setPlayerQueue([...studioQueue]);
          setCurrentSongIndex(0);
          setIsPlaying(true);
      } else {
          setPlayerQueue([]); 
          setIsPlaying(false);
      }
  };

  const handleGoOffAir = () => {
      setIsAutoDJ(true);
      setIsTalkOver(false);
      setStudioQueue([]);
      console.log("Saindo do ar. Voltando para Automação Imediata...");
      checkAndEnforceSchedule(true);
  };

  const playInterruptionSong = (song: Song) => {
      const newQueue = isAutoDJ ? [song, ...playerQueue] : [...playerQueue];
      if(!isAutoDJ) newQueue.splice(currentSongIndex + 1, 0, song);
      setPlayerQueue(newQueue);
      if(isAutoDJ) setCurrentSongIndex(0); else setCurrentSongIndex(currentSongIndex + 1);
      setIsPlaying(true);
  };
  const playPrev = () => { if (playerQueue.length > 0 && currentSongIndex > 0) setCurrentSongIndex(prev => prev - 1); };
  
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
  };

  const handleLocutorLogin = (accessKey: string) => {
      const foundDj = djs.find(d => d.accessKey === accessKey);
      if (foundDj) {
          setCurrentUser(foundDj);
          setUserRole('locutor');
          setCurrentView('studio'); // Locutor goes straight to studio
          // Auto-load profile
          handleLoadDJProfile(foundDj.id);
      } else {
          alert("Chave de acesso inválida ou locutor não encontrado.");
      }
  };

  const handleLogout = () => {
      setUserRole('public');
      setCurrentView('public_site');
      setCurrentUser(null);
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
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} crossOrigin="anonymous" autoPlay />
      {currentView === 'public_site' ? (
        <PublicSite 
             currentSong={currentSong} nextSong={nextSong} history={songHistory} isPlaying={isPlaying}
             onAdminLogin={handleAdminLogin} // Mudamos de onExit para logins especificos
             onLocutorLogin={handleLocutorLogin}
             onTogglePlay={togglePlay} config={stationConfig}
             top10Playlist={top10Playlist} votes={votes} onVote={handleRegisterVote} onSendMessage={handleSendMessage}
             schedule={schedule} playlists={playlists}
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
