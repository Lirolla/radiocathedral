
import React, { useState, useRef } from 'react';
import { Song, Playlist } from '../types';
import { uploadSongToR2 } from '../services/storageService';
import { updateSongInPlaylist } from '../services/dbService';
import { TrashIcon, UploadIcon, FolderIcon, PlusIcon, ArrowLeftIcon, MusicIcon, RestoreIcon, LockIcon, PencilIcon, CheckIcon, XMarkIcon } from './Icons';

interface LibraryManagerProps {
  playlists: Playlist[]; // Apenas listas do tipo 'kind: storage' serão passadas
  onCreateFolder: (name: string) => Promise<void> | void; // Allow async
  onDeleteFolder: (id: string) => void;
  onAddSongToFolder: (folderId: string, song: Song) => void;
  onAddSongsToFolder?: (folderId: string, songs: Song[]) => Promise<void>; // Nova prop para lote
  onRemoveSongFromFolder: (folderId: string, songId: string) => void;
  onSyncFolder?: (folderId: string) => Promise<void>; // Nova prop para Sync R2
}

const LibraryManager: React.FC<LibraryManagerProps> = ({ 
  playlists, 
  onCreateFolder,
  onDeleteFolder,
  onAddSongToFolder,
  onAddSongsToFolder,
  onRemoveSongFromFolder,
  onSyncFolder
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Estados de Upload e Sync
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Edição (Rename)
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  const activeFolder = playlists.find(p => p.id === selectedFolderId);

  const handleCreateConfirm = async () => {
    if (newFolderName.trim()) {
      setIsCreatingLoading(true);
      try {
          await onCreateFolder(newFolderName);
          setNewFolderName('');
          setIsCreating(false);
      } catch (e) {
          console.error(e);
          // Don't close modal on error so user can retry
      } finally {
          setIsCreatingLoading(false);
      }
    }
  };

  const handleSyncClick = async () => {
      if (!activeFolder || !onSyncFolder) return;
      setIsSyncing(true);
      try {
          await onSyncFolder(activeFolder.id);
      } catch (err) {
          console.error(err);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFolder) return;
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    // LISTA TEMPORÁRIA PARA ACUMULAR TODAS AS MÚSICAS
    const songsBatch: Song[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('audio/')) {
          // Upload Individual para o R2 (Arquivo por Arquivo)
          const newSong = await uploadSongToR2(file, activeFolder.name);
          songsBatch.push(newSong);
        }
        // Atualiza contador visual
        setUploadProgress({ current: i + 1, total: files.length });
      }

      // SALVA NO BANCO DE DADOS DE UMA VEZ SÓ (BATCH SAVE)
      if (songsBatch.length > 0) {
          if (onAddSongsToFolder) {
              await onAddSongsToFolder(activeFolder.id, songsBatch);
          } else {
              // Fallback para legado (um por um) se a função nova não existir
              songsBatch.forEach(s => onAddSongToFolder(activeFolder.id, s));
          }
      }

    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Houve um erro durante o envio. Verifique o console.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // 1. VISÃO DE PASTAS (ROOT)
  if (!activeFolder) {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <header className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Acervo Musical</h2>
            <p className="text-gray-400">Organize seus arquivos de áudio por pastas para usar na programação.</p>
        </header>

        {/* Create Folder */}
        <div 
            className={`w-full border-2 border-dashed ${isCreating ? 'border-blue-500 bg-gray-900' : 'border-gray-800 bg-gray-900/30 hover:border-gray-600'} rounded-xl p-4 mb-8 cursor-pointer transition-all duration-300`}
            onClick={() => !isCreating && setIsCreating(true)}
        >
            {isCreating ? (
                <div className="flex flex-col md:flex-row items-center gap-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1 w-full">
                        <input 
                            type="text"
                            autoFocus
                            placeholder="Nome da nova pasta (ex: Pagode, Sertanejo)..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
                            className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                            disabled={isCreatingLoading}
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={handleCreateConfirm}
                            disabled={isCreatingLoading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 min-w-[120px]"
                        >
                            {isCreatingLoading ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <PlusIcon className="w-5 h-5" />}
                            {isCreatingLoading ? 'CRIANDO...' : 'CRIAR PASTA'}
                        </button>
                        <button 
                            onClick={() => { setIsCreating(false); setNewFolderName(''); }}
                            disabled={isCreatingLoading}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-3 py-2 text-gray-500 group-hover:text-blue-400 transition">
                    <div className="p-2 bg-gray-800 rounded-full group-hover:bg-blue-500/20 transition">
                        <FolderIcon className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-lg">Nova Pasta de Arquivos</span>
                </div>
            )}
        </div>

        {/* Folder Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map(folder => {
                const isProtected = folder.id === 'backup-playlist-default' || folder.id === 'jingles-default' || folder.id === 'commercials-default';
                
                return (
                <div 
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:bg-gray-800 hover:border-gray-700 transition cursor-pointer group relative ${isProtected ? 'border-b-4 border-b-yellow-500' : ''}`}
                >
                    {!isProtected && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                                className="text-gray-600 hover:text-red-500 p-1"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {isProtected && (
                         <div className="absolute top-2 right-2 opacity-50 text-gray-500" title="Pasta de Sistema (Protegida)">
                            <LockIcon className="w-3 h-3" />
                         </div>
                    )}
                    
                    <FolderIcon className={`w-16 h-16 ${isProtected ? 'text-yellow-500/80' : 'text-gray-700 group-hover:text-blue-500'} transition`} />
                    
                    <div>
                        <h3 className="font-bold text-white truncate max-w-[150px]">{folder.name}</h3>
                        <p className="text-xs text-gray-500">{folder.songs.length} arquivos</p>
                    </div>
                </div>
            )})}
        </div>
      </div>
    );
  }

  // 2. DENTRO DA PASTA (UPLOAD & SYNC)
  return (
    <div className="h-full p-6 flex flex-col">
        <header className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
            <button 
                onClick={() => setSelectedFolderId(null)}
                className="p-2 hover:bg-gray-800 rounded-full transition"
            >
                <ArrowLeftIcon className="w-6 h-6 text-gray-300" />
            </button>
            
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <FolderIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">Acervo Musical / {activeFolder.name}</span>
                </div>
                <h2 className="text-3xl font-bold text-white">{activeFolder.name}</h2>
            </div>

            <div className="flex items-center gap-3">
                {/* BOTÃO SYNC */}
                {onSyncFolder && (
                    <button 
                        onClick={handleSyncClick}
                        disabled={isSyncing || isUploading}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition"
                        title="Recuperar arquivos perdidos da nuvem"
                    >
                        <RestoreIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Buscando...' : 'Sincronizar Arquivos'}
                    </button>
                )}

                {/* BOTÃO UPLOAD */}
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
                        className={`bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-900/20 ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <UploadIcon className="w-5 h-5" />
                        )}
                        {isUploading 
                        ? (uploadProgress ? `Enviando ${uploadProgress.current}/${uploadProgress.total}` : 'Iniciando...') 
                        : `Upload para ${activeFolder.name}`}
                    </button>
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto">
            {activeFolder.songs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl m-4">
                    <UploadIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p>Pasta "{activeFolder.name}" vazia.</p>
                    <p className="text-sm mt-2">Clique em <strong>Upload</strong> para enviar novas músicas.</p>
                    <p className="text-sm">Ou clique em <strong>Sincronizar Arquivos</strong> se você já fez o envio.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-500 text-xs border-b border-gray-800 uppercase tracking-wider">
                            <th className="py-3 pl-4 font-medium w-12">#</th>
                            <th className="py-3 font-medium">Arquivo (Título / Artista)</th>
                            <th className="py-3 font-medium">Caminho R2</th>
                            <th className="py-3 pr-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {activeFolder.songs.map((song, idx) => {
                            const isEditing = editingSongId === song.id;

                            return (
                            <tr key={song.id} className="group hover:bg-gray-900 transition-colors border-b border-gray-800/50">
                                <td className="py-3 pl-4 text-gray-500">{idx + 1}</td>
                                <td className="py-3 font-medium text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-gray-500 shrink-0">
                                            <MusicIcon className="w-4 h-4" />
                                        </div>
                                        
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
                                                <div className="font-bold">{song.title}</div>
                                                <div className="text-xs text-gray-500">{song.artist}</div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 text-gray-500 text-xs truncate max-w-[200px]">
                                    {song.url.split('/').pop()}
                                </td>
                                <td className="py-3 pr-4 text-right">
                                    {isEditing ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => saveEditing(activeFolder.id)} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded transition" title="Salvar">
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
                                                className="text-gray-500 hover:text-blue-400 p-2 transition"
                                                title="Renomear (Edita apenas o nome visual)"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => onRemoveSongFromFolder(activeFolder.id, song.id)}
                                                className="text-gray-500 hover:text-red-400 p-2 transition"
                                                title="Excluir arquivo"
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
    </div>
  );
};

export default LibraryManager;
