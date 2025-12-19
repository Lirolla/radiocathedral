
import React, { useState, useRef, useEffect } from 'react';
import { Song, Playlist, AutoDJSettings, PlaylistType } from '../types';
import { uploadSongToR2 } from '../services/storageService';
import { updateSongInPlaylist } from '../services/dbService';
import { TrashIcon, UploadIcon, MusicIcon, PlusIcon, ArrowLeftIcon, ShuffleIcon, MegaphoneIcon, CogIcon, BoltIcon, LibraryIcon, ArchiveIcon, LockIcon, FolderIcon, PencilIcon, CheckIcon, XMarkIcon } from './Icons';
import { savePlaylist } from '../services/dbService';

interface PlaylistManagerProps {
  playlists: Playlist[]; // Listas passadas para exibição (se 'library', exibe shows; se 'jingle', exibe jingles)
  allPlaylists?: Playlist[]; // Todas as listas (incluindo Storage Folders) para compor a biblioteca geral
  onCreatePlaylist: (name: string, type?: PlaylistType, ownerId?: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddSongToPlaylist: (playlistId: string, song: Song) => void;
  onAddSongsToPlaylist?: (playlistId: string, songs: Song[]) => Promise<void>; // Nova prop Batch
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  onPlayPlaylistMixed: (playlistId: string) => void;
  isJingleMode?: boolean;
  stationMode?: boolean; 
  lockCreation?: boolean;
  forcedPlaylist?: Playlist; 
  autoDJSettings?: AutoDJSettings;
  onUpdateSettings?: (settings: AutoDJSettings) => void;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ 
  playlists, 
  allPlaylists = [],
  onCreatePlaylist,
  onDeletePlaylist,
  onAddSongToPlaylist,
  onAddSongsToPlaylist,
  onRemoveSongFromPlaylist,
  onPlayPlaylistMixed,
  isJingleMode = false,
  stationMode = false,
  lockCreation = false,
  forcedPlaylist,
  autoDJSettings,
  onUpdateSettings
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false); // Toggle Master Library View
  const [libraryFilter, setLibraryFilter] = useState<string | null>(null); // Filtro de Pasta selecionada
  
  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Edição (Rename)
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  // Derive "Master Library" from STORAGE FOLDERS
  const masterLibrary = React.useMemo(() => {
     // If music mode, we want songs from playlists where kind === 'storage'
     // If jingle mode, we might just list everything or specific jingle folders
     
     const source = allPlaylists.length > 0 ? allPlaylists : playlists;
     const librarySongs: { song: Song, folderName: string }[] = [];

     source.forEach(pl => {
         // Na visão de Música, pegamos músicas das pastas de ARQUIVO (storage)
         // Na visão de Jingle, pegamos tudo que for jingle/commercial
         
         const isSourceFolder = pl.kind === 'storage'; 
         
         if (!isJingleMode && isSourceFolder && pl.type === 'music') {
             pl.songs.forEach(s => librarySongs.push({ song: s, folderName: pl.name }));
         }
         
         // Fallback: If no storage folders exist yet, maybe user put songs in other playlists
         if (!isJingleMode && pl.kind !== 'storage' && pl.type === 'music') {
            // Optional: Include songs from other playlists? Maybe confusing. Let's stick to storage.
         }
     });
     
     // Remove duplicates by ID or URL
     const unique = new Map();
     librarySongs.forEach(item => {
         if(!unique.has(item.song.id)) unique.set(item.song.id, item);
     });
     
     return Array.from(unique.values());
  }, [allPlaylists, playlists, isJingleMode]);

  // Lista Filtrada e Pastas Únicas
  const uniqueFolders = React.useMemo(() => {
      return Array.from(new Set(masterLibrary.map(item => item.folderName))).sort();
  }, [masterLibrary]);

  const filteredLibrary = React.useMemo(() => {
      if (!libraryFilter) return masterLibrary;
      return masterLibrary.filter(item => item.folderName === libraryFilter);
  }, [masterLibrary, libraryFilter]);

  const activePlaylist = forcedPlaylist || playlists.find(p => p.id === selectedPlaylistId);

  const handleCreateConfirm = () => {
    if (newPlaylistName.trim()) {
      const typeToCreate = isJingleMode ? 'jingle' : 'music';
      onCreatePlaylist(newPlaylistName, typeToCreate);
      setNewPlaylistName('');
      setIsCreating(false);
    } else {
        alert("Digite um nome para a playlist.");
    }
  };

  const handleFixFolders = async () => {
      if(!stationMode) return;
      const defaults = [
          { id: 'jingles-default', name: 'Vinhetas da Rádio', type: 'jingle', kind: 'storage', songs: [], ownerId: 'station' },
          { id: 'commercials-default', name: 'Comerciais & Ads', type: 'commercial', kind: 'storage', songs: [], ownerId: 'station' }
      ];
      try {
          for(const p of defaults) {
              await savePlaylist(p as Playlist);
          }
          alert("Pastas recriadas! Atualize a página se necessário.");
      } catch (e: any) { alert(e.message); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePlaylist) return;
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    const batchSongs: Song[] = [];

    try {
      // Definir nome da pasta para upload organizado
      let targetFolderName = activePlaylist.name;
      if (activePlaylist.type === 'commercial') targetFolderName = 'Comerciais';
      if (activePlaylist.type === 'jingle' && stationMode) targetFolderName = 'Vinhetas';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('audio/')) {
          const newSong = await uploadSongToR2(file, targetFolderName);
          if (activePlaylist.type === 'jingle' || activePlaylist.type === 'commercial') {
              newSong.isJingle = true;
          }
          batchSongs.push(newSong);
        }
        setUploadProgress({ current: i + 1, total: files.length });
      }

      // Salva no banco em lote
      if (batchSongs.length > 0) {
          if (onAddSongsToPlaylist) {
              await onAddSongsToPlaylist(activePlaylist.id, batchSongs);
          } else {
              batchSongs.forEach(s => onAddSongToPlaylist(activePlaylist.id, s));
          }
      }

    } catch (error) {
      console.error("Erro no upload:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const playInstantSound = (url: string) => {
      const audio = new Audio(url);
      audio.volume = 0.9;
      audio.play();
  };
  
  // ADD FROM LIBRARY TO PLAYLIST
  const handleAddFromLibrary = (song: Song) => {
      if (activePlaylist) {
          onAddSongToPlaylist(activePlaylist.id, { ...song, id: crypto.randomUUID() });
      }
  };

  // --- EDIT FUNCTIONS ---
  const startEditing = (song: Song) => {
      setEditingSongId(song.id);
      setEditTitle(song.title);
      setEditArtist(song.artist);
  };

  const cancelEditing = () => {
      setEditingSongId(null);
      setEditTitle('');
      setEditArtist('');
  };

  const saveEditing = async (playlistId: string) => {
      if (editingSongId && editTitle.trim()) {
          await updateSongInPlaylist(playlistId, editingSongId, editTitle, editArtist);
          setEditingSongId(null);
      }
  };

  // 1. VIEW: LIST OF PLAYLISTS
  if (!activePlaylist) {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">
                {stationMode ? 'Automação (Auto DJ)' : (isJingleMode ? 'Cartucheira de Efeitos' : 'Playlists & Shows')}
            </h2>
            <p className="text-gray-400">
                {stationMode 
                    ? 'Gerencie os arquivos que o Auto DJ toca nos intervalos (Vinhetas e Comerciais).' 
                    : (isJingleMode ? 'Crie bancos de efeitos sonoros para usar ao vivo.' : 'Monte a grade de programação usando músicas do seu Acervo.')}
            </p>
          </div>
        </header>

        {/* SETTINGS PANEL (Auto DJ Rules) */}
        {isJingleMode && stationMode && autoDJSettings && onUpdateSettings && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 shadow-lg shadow-purple-900/10">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                    <CogIcon className="w-6 h-6 text-purple-400" />
                    <h3 className="text-xl font-bold text-white">Regras do Auto DJ</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div>
                         <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-300">Vinhetas / Efeitos</span>
                            <button onClick={() => onUpdateSettings({ ...autoDJSettings, enableJingles: !autoDJSettings.enableJingles })} className={`w-12 h-6 rounded-full relative transition ${autoDJSettings.enableJingles ? 'bg-purple-500' : 'bg-gray-700'}`}>
                               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${autoDJSettings.enableJingles ? 'left-7' : 'left-1'}`}></div>
                            </button>
                         </div>
                         <div className="bg-black/40 p-4 rounded-lg border border-gray-800">
                            <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Frequência</span><span className="text-white font-bold">{autoDJSettings.jingleInterval} músicas</span></div>
                            <input type="range" min="1" max="10" value={autoDJSettings.jingleInterval} onChange={(e) => onUpdateSettings({ ...autoDJSettings, jingleInterval: parseInt(e.target.value) })} disabled={!autoDJSettings.enableJingles} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                         </div>
                     </div>
                     <div>
                         <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-300">Comerciais / Ads</span>
                            <button onClick={() => onUpdateSettings({ ...autoDJSettings, enableCommercials: !autoDJSettings.enableCommercials })} className={`w-12 h-6 rounded-full relative transition ${autoDJSettings.enableCommercials ? 'bg-green-500' : 'bg-gray-700'}`}>
                               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${autoDJSettings.enableCommercials ? 'left-7' : 'left-1'}`}></div>
                            </button>
                         </div>
                         <div className="bg-black/40 p-4 rounded-lg border border-gray-800">
                            <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Frequência</span><span className="text-white font-bold">{autoDJSettings.commercialInterval} músicas</span></div>
                            <input type="range" min="2" max="20" value={autoDJSettings.commercialInterval} onChange={(e) => onUpdateSettings({ ...autoDJSettings, commercialInterval: parseInt(e.target.value) })} disabled={!autoDJSettings.enableCommercials} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                         </div>
                     </div>
                     <div>
                         <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-300">Hora Certa (Voz AI)</span>
                            <button onClick={() => onUpdateSettings({ ...autoDJSettings, enableTimeAnnouncement: !autoDJSettings.enableTimeAnnouncement })} className={`w-12 h-6 rounded-full relative transition ${autoDJSettings.enableTimeAnnouncement ? 'bg-blue-500' : 'bg-gray-700'}`}>
                               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${autoDJSettings.enableTimeAnnouncement ? 'left-7' : 'left-1'}`}></div>
                            </button>
                         </div>
                         <div className="bg-black/40 p-4 rounded-lg border border-gray-800">
                            <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Frequência</span><span className="text-white font-bold">{autoDJSettings.timeAnnouncementInterval} músicas</span></div>
                            <input type="range" min="2" max="20" value={autoDJSettings.timeAnnouncementInterval} onChange={(e) => onUpdateSettings({ ...autoDJSettings, timeAnnouncementInterval: parseInt(e.target.value) })} disabled={!autoDJSettings.enableTimeAnnouncement} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* --- NEW PLAYLIST SECTION (TOP) --- */}
        {!lockCreation && !forcedPlaylist && (
            <div 
              className={`w-full border-2 border-dashed ${isCreating ? 'border-purple-500 bg-gray-900' : 'border-gray-800 bg-gray-900/30 hover:border-gray-600 hover:bg-gray-900'} rounded-xl p-4 mb-8 cursor-pointer transition-all duration-300`}
              onClick={() => !isCreating && setIsCreating(true)}
            >
                {isCreating ? (
                    <div className="flex flex-col md:flex-row items-center gap-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-1 w-full">
                            <input 
                                type="text"
                                autoFocus
                                placeholder={isJingleMode ? "Nome da cartucheira..." : "Nome do programa/sequência..."}
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                                className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button 
                              onClick={handleCreateConfirm}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 min-w-[120px]"
                            >
                                <PlusIcon className="w-5 h-5" />
                                SALVAR
                            </button>
                            <button 
                              onClick={() => { setIsCreating(false); setNewPlaylistName(''); }}
                              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-3 py-2 text-gray-500 group-hover:text-purple-400 transition">
                        <div className="p-2 bg-gray-800 rounded-full group-hover:bg-purple-500/20 transition">
                            <PlusIcon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-lg">
                            {isJingleMode ? 'Criar Banco de Efeitos' : 'Criar Nova Playlist / Show'}
                        </span>
                    </div>
                )}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {playlists.map(playlist => {
             const isProtected = playlist.id === 'backup-playlist-default' || playlist.id === 'jingles-default' || playlist.id === 'commercials-default';
             
             return (
            <div 
              key={playlist.id} 
              onClick={() => setSelectedPlaylistId(playlist.id)}
              className={`group bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between h-48 relative
                ${playlist.type === 'commercial' ? 'hover:border-green-500/50 hover:shadow-green-900/10' : 'hover:border-purple-500/50 hover:shadow-purple-900/10'}
                ${isProtected ? 'border-l-4 border-l-yellow-500' : ''}
              `}
            >
               {!lockCreation && !isProtected && (
                   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeletePlaylist(playlist.id); }}
                        className="p-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500 hover:text-white"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                   </div>
               )}
               
               {isProtected && (
                   <div className="absolute top-3 right-3 opacity-50 text-gray-400" title="Pasta protegida do sistema">
                       <LockIcon className="w-4 h-4" />
                   </div>
               )}

               <div>
                 <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors
                    ${playlist.type === 'commercial' 
                        ? 'bg-green-900/20 text-green-400 group-hover:bg-green-600 group-hover:text-white' 
                        : isJingleMode 
                            ? 'bg-purple-900/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white' 
                            : 'bg-gray-800 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'}
                 `}>
                    {playlist.type === 'commercial' ? <MegaphoneIcon className="w-6 h-6" /> : (isJingleMode ? <BoltIcon className="w-6 h-6" /> : <MusicIcon className="w-6 h-6" />)}
                 </div>
                 
                 {playlist.type === 'commercial' && (
                    <span className="text-[10px] font-bold uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded mb-2 inline-block">Comercial</span>
                 )}
                 {playlist.type === 'jingle' && stationMode && (
                    <span className="text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded mb-2 inline-block">Vinheta</span>
                 )}
                 {playlist.type === 'jingle' && !stationMode && (
                    <span className="text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded mb-2 inline-block">Efeitos</span>
                 )}
                 {playlist.id === 'backup-playlist-default' && (
                     <span className="text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded mb-2 inline-block">Backup</span>
                 )}

                 <h3 className="text-xl font-bold text-white truncate">{playlist.name}</h3>
                 <p className="text-sm text-gray-500">{playlist.songs.length} arquivos</p>
               </div>
            </div>
          )})}

          {/* Empty State / Fix Folders */}
          {playlists.length === 0 && !isCreating && (
            <div className="col-span-full h-40 flex flex-col items-center justify-center text-gray-600 bg-gray-900/50 border border-gray-800 rounded-xl gap-4">
               <p>{isJingleMode ? "Nenhum banco de áudio encontrado." : "Nenhuma playlist criada."}</p>
               
               {stationMode && isJingleMode && (
                   <button 
                    onClick={handleFixFolders}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition"
                   >
                       <ArchiveIcon className="w-4 h-4" />
                       Inicializar Pastas do Sistema
                   </button>
               )}

               {!lockCreation && !stationMode && <p className="text-sm">Clique em "Criar Nova" acima.</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. VIEW: INSIDE A PLAYLIST
  return (
    <div className="h-full flex flex-col p-6 relative">
      <header className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
        {!forcedPlaylist && (
            <button 
            onClick={() => setSelectedPlaylistId(null)}
            className="p-2 hover:bg-gray-800 rounded-full transition"
            >
            <ArrowLeftIcon className="w-6 h-6 text-gray-300" />
            </button>
        )}
        <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="text-xs text-gray-500 uppercase tracking-wider">
                {activePlaylist?.type === 'commercial' ? 'Pasta de Comerciais' : 
                 (stationMode ? 'Pasta de Vinhetas (Auto DJ)' : 'Show / Sequência')}
             </span>
           </div>
           <h2 className="text-3xl font-bold text-white">{activePlaylist?.name}</h2>
        </div>

        <div className="ml-auto flex gap-3">
             {/* If Music Playlist, allow opening Archive */}
             {!isJingleMode && (
                 <button 
                    onClick={() => setShowLibrary(!showLibrary)}
                    className={`px-5 py-2.5 rounded-full font-bold flex items-center gap-2 transition border ${showLibrary ? 'bg-purple-600 border-purple-500 text-white' : 'bg-transparent border-gray-600 text-gray-300 hover:text-white'}`}
                 >
                    <LibraryIcon className="w-5 h-5" />
                    Abrir Acervo Musical
                 </button>
             )}

             {activePlaylist?.type === 'music' && (
                 <button 
                    onClick={() => activePlaylist && onPlayPlaylistMixed(activePlaylist.id)}
                    className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-full font-bold flex items-center gap-2 transition"
                 >
                    <ShuffleIcon className="w-5 h-5" />
                    Misturar e Tocar
                 </button>
             )}

             {/* Direct Upload for Jingles or if needed */}
             {isJingleMode && (
                 <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className={`bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 transition shadow-lg shadow-purple-900/20 ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <UploadIcon className="w-5 h-5" />
                      )}
                      {isUploading 
                          ? (uploadProgress ? `Enviando ${uploadProgress.current}/${uploadProgress.total}` : 'Iniciando...') 
                          : 'Upload'}
                    </button>
                 </div>
             )}
        </div>
      </header>
      
      {/* LIBRARY SIDEBAR (ACERVO) */}
      {showLibrary && (
          <div className="absolute top-24 right-6 bottom-6 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-10 duration-200">
             <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-xl">
                 <h3 className="font-bold text-white flex items-center gap-2">
                     <LibraryIcon className="w-5 h-5 text-purple-400" />
                     Acervo Musical
                 </h3>
                 <button onClick={() => setShowLibrary(false)} className="text-gray-500 hover:text-white">✕</button>
             </div>

             {/* FOLDER TABS FILTER */}
             <div className="p-3 border-b border-gray-800 bg-gray-950 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button
                    onClick={() => setLibraryFilter(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${!libraryFilter ? 'bg-white text-black border-white' : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
                >
                    Todas
                </button>
                {uniqueFolders.map(folder => (
                    <button
                        key={folder}
                        onClick={() => setLibraryFilter(folder)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition border ${libraryFilter === folder ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
                    >
                        {libraryFilter === folder && <FolderIcon className="w-3 h-3 text-white" />}
                        {folder}
                    </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {filteredLibrary.length === 0 ? (
                     <div className="text-center p-8 text-gray-500">
                         {libraryFilter ? `Nenhuma música encontrada na pasta "${libraryFilter}".` : "Nenhuma música encontrada no Acervo."}
                         <br/><br/>
                         Vá em <strong>Acervo Musical</strong> no menu para subir arquivos.
                     </div>
                 ) : (
                     filteredLibrary.map((item, idx) => (
                         <div key={`${item.song.id}-${idx}`} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded group border border-transparent hover:border-gray-700">
                             <div className="overflow-hidden">
                                 <p className="font-bold text-sm truncate text-white">{item.song.title}</p>
                                 <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                     {item.song.artist} 
                                     <span className="text-[9px] bg-gray-700 px-1 rounded text-gray-300">{item.folderName}</span>
                                 </p>
                             </div>
                             <button 
                                onClick={() => handleAddFromLibrary(item.song)}
                                className="bg-purple-600 text-white p-1.5 rounded hover:bg-purple-500"
                                title="Adicionar a esta playlist"
                             >
                                 <PlusIcon className="w-4 h-4" />
                             </button>
                         </div>
                     ))
                 )}
             </div>
             <div className="p-2 text-xs text-center text-gray-500 bg-gray-950 rounded-b-xl border-t border-gray-800">
                 {filteredLibrary.length} arquivos {libraryFilter ? `em ${libraryFilter}` : 'total'}
             </div>
          </div>
      )}

      {/* QUICK PLAY CARTUCHEIRA (JINGLES) */}
      {isJingleMode && activePlaylist && activePlaylist.songs.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                  <BoltIcon className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-gray-300">Preview (Clique para ouvir)</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {activePlaylist.songs.map(song => (
                      <button 
                        key={`quick-${song.id}`}
                        onClick={() => song.url && playInstantSound(song.url)}
                        className="bg-gray-800 hover:bg-yellow-500 hover:text-black border border-gray-700 rounded-lg p-3 text-xs font-bold transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center text-center h-20"
                      >
                         <span className="line-clamp-2">{song.title}</span>
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2">
         {activePlaylist?.songs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
               <UploadIcon className="w-16 h-16 mb-4" />
               <p className="text-lg">Esta lista está vazia.</p>
               {isJingleMode 
                  ? <p>Faça upload dos efeitos agora.</p> 
                  : <p>Clique em "Abrir Acervo" para adicionar músicas.</p>}
            </div>
         ) : (
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                     <th className="py-3 font-medium w-12">#</th>
                     <th className="py-3 font-medium">Título / Artista</th>
                     <th className="py-3 font-medium">Duração</th>
                     <th className="py-3 font-medium text-right">Ação</th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {activePlaylist?.songs.map((song, idx) => {
                     const isEditing = editingSongId === song.id;

                     return (
                     <tr key={song.id} className="group hover:bg-gray-800/50 transition-colors border-b border-gray-800/50">
                        <td className="py-3 pl-2 text-gray-500">{idx + 1}</td>
                        <td className="py-3 font-medium text-white">
                            {isEditing ? (
                                <div className="flex flex-col gap-1 w-full max-w-sm animate-in fade-in duration-200">
                                    <input 
                                        type="text" 
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="bg-black border border-blue-500 rounded px-2 py-1 text-white text-xs w-full focus:outline-none"
                                        placeholder="Título da Música"
                                        autoFocus
                                    />
                                    <input 
                                        type="text" 
                                        value={editArtist}
                                        onChange={(e) => setEditArtist(e.target.value)}
                                        className="bg-black border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs w-full focus:outline-none focus:border-blue-500"
                                        placeholder="Nome do Artista"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <div className="text-white font-bold">{song.title}</div>
                                    <div className="text-gray-400 text-xs">{song.artist}</div>
                                </div>
                            )}
                        </td>
                        <td className="py-3 text-gray-400">
                            {/* Duração mockada ou real se disponível */}
                            --:--
                        </td>
                        <td className="py-3 text-right pr-2">
                           {isEditing ? (
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => saveEditing(activePlaylist.id)} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded transition" title="Salvar">
                                        <CheckIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition" title="Cancelar">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                           ) : (
                               <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                      onClick={() => startEditing(song)}
                                      className="text-gray-600 hover:text-blue-400 transition p-2"
                                      title="Renomear"
                                   >
                                      <PencilIcon className="w-4 h-4" />
                                   </button>
                                   <button 
                                      onClick={() => onRemoveSongFromPlaylist(activePlaylist.id, song.id)}
                                      className="text-gray-600 hover:text-red-400 transition p-2"
                                      title="Remover"
                                   >
                                      <TrashIcon className="w-4 h-4" />
                                   </button>
                               </div>
                           )}
                        </td>
                     </tr>
                  )})}
               </tbody>
            </table>
         )}
      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">
         Total: {activePlaylist?.songs.length} arquivos.
      </div>
    </div>
  );
};

export default PlaylistManager;
