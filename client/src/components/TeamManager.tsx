
import React, { useState } from 'react';
import { DJ, Playlist, Song, PlaylistType } from '../types';
import { PlusIcon, TrashIcon, KeyIcon, SignalIcon, ArrowLeftIcon, MegaphoneIcon, MusicIcon, CheckIcon, PencilIcon, XMarkIcon } from './Icons';
import PlaylistManager from './PlaylistManager';

interface TeamManagerProps {
  djs: DJ[];
  onAddDJ: (name: string, role: DJ['role']) => void;
  onRemoveDJ: (id: string) => void;
  onUpdateDJ: (dj: DJ) => Promise<void> | void; // New prop for updating DJ
  // Playlist functionality to pass down
  playlists: Playlist[];
  onCreatePlaylist: (name: string, type?: PlaylistType, ownerId?: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddSongToPlaylist: (playlistId: string, song: Song) => void;
  onAddSongsToPlaylist?: (playlistId: string, songs: Song[]) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  onPlayPlaylistMixed: (playlistId: string) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ 
    djs, onAddDJ, onRemoveDJ, onUpdateDJ,
    playlists, onCreatePlaylist, onDeletePlaylist, onAddSongToPlaylist, onRemoveSongFromPlaylist, onPlayPlaylistMixed
}) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<DJ['role']>('Locutor');
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  
  // State for Editing Key
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editKeyValue, setEditKeyValue] = useState('');

  // State for Managing a Specific DJ
  const [managingState, setManagingState] = useState<{ djId: string, type: 'music' | 'jingle' } | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddDJ(newName, newRole);
      setNewName('');
    }
  };

  const toggleKeyReveal = (id: string) => {
    setRevealedKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const startEditingKey = (dj: DJ) => {
      setEditingKeyId(dj.id);
      setEditKeyValue(dj.accessKey);
      // Reveal key when editing so they see what they type
      setRevealedKeys(prev => ({...prev, [dj.id]: true}));
  };

  const cancelEditingKey = () => {
      setEditingKeyId(null);
      setEditKeyValue('');
  };

  const saveKey = async (dj: DJ) => {
      if(editKeyValue.trim()) {
          const newKey = editKeyValue.trim();
          // Check for duplicate key
          const exists = djs.some(d => d.id !== dj.id && d.accessKey === newKey);
          if (exists) {
              alert("Esta chave já está em uso por outro locutor. Escolha outra.");
              return;
          }

          await onUpdateDJ({ ...dj, accessKey: newKey });
          setEditingKeyId(null);
      } else {
          alert("A chave não pode ficar vazia.");
      }
  };

  const handleManagePlaylist = (djId: string, djName: string, type: 'music' | 'jingle') => {
      // Check if DJ already has a playlist of this type
      let djPlaylist = playlists.find(p => p.ownerId === djId && p.type === type);
      
      // If not, trigger creation automatically
      if (!djPlaylist) {
          const name = type === 'music' ? `Playlist de ${djName}` : `Efeitos de ${djName}`;
          onCreatePlaylist(name, type, djId);
      }
      
      setManagingState({ djId, type });
  };

  const selectedDj = djs.find(d => d.id === managingState?.djId);

  // --- VIEW: MANAGE SPECIFIC DJ PLAYLIST ---
  if (selectedDj && managingState) {
      // Find the playlist for this DJ and Type
      const djPlaylist = playlists.find(p => p.ownerId === selectedDj.id && p.type === managingState.type);

      return (
          <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setManagingState(null)}
                        className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white"
                      >
                          <ArrowLeftIcon className="w-6 h-6" />
                      </button>
                      <div>
                          <h2 className="text-2xl font-bold text-white">
                              {managingState.type === 'music' ? 'Músicas' : 'Cartucheira'}: {selectedDj.name}
                          </h2>
                          <p className="text-sm text-gray-500">
                              {managingState.type === 'music' 
                                ? 'Adicione as músicas que este locutor irá tocar.' 
                                : 'Adicione vinhetas e efeitos para os botões do estúdio.'}
                          </p>
                      </div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg" style={{ backgroundColor: selectedDj.avatarColor }}>
                       {selectedDj.name.substring(0,2).toUpperCase()}
                  </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                  <PlaylistManager 
                     playlists={playlists}
                     // Force the specific playlist view
                     forcedPlaylist={djPlaylist}
                     onCreatePlaylist={(name, type) => onCreatePlaylist(name, type, selectedDj.id)}
                     onDeletePlaylist={onDeletePlaylist}
                     onAddSongToPlaylist={onAddSongToPlaylist}
                     onRemoveSongFromPlaylist={onRemoveSongFromPlaylist}
                     onPlayPlaylistMixed={onPlayPlaylistMixed}
                     isJingleMode={managingState.type === 'jingle'}
                     stationMode={false} // DJ Mode
                  />
                  {!djPlaylist && (
                      <div className="p-10 text-center text-gray-500">
                          Inicializando lista do locutor...
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- VIEW: LIST OF DJS ---
  return (
    <div className="h-full p-6 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Gerenciar Equipe</h2>
        <p className="text-gray-400">Cadastre locutores e prepare suas playlists e efeitos individuais.</p>
      </header>

      {/* Cadastro */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PlusIcon className="w-5 h-5 text-purple-400" />
            Novo Membro
         </h3>
         <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs text-gray-500 mb-1 uppercase">Nome do DJ/Locutor</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: DJ Alok, Locutor João..." 
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
            </div>
            <div className="w-full md:w-48">
                <label className="block text-xs text-gray-500 mb-1 uppercase">Permissão</label>
                <select 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="Admin">Admin</option>
                    <option value="Locutor">Locutor (Padrão)</option>
                    <option value="Convidado">Convidado</option>
                </select>
            </div>
            <button 
                type="submit"
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition"
            >
                Cadastrar
            </button>
         </form>
      </div>

      {/* Lista de DJs */}
      <div className="grid grid-cols-1 gap-4">
          {djs.map((dj) => {
              const musicList = playlists.find(p => p.ownerId === dj.id && p.type === 'music');
              const musicCount = musicList?.songs.length || 0;
              
              const jingleList = playlists.find(p => p.ownerId === dj.id && p.type === 'jingle');
              const jingleCount = jingleList?.songs.length || 0;
              
              const isEditingKey = editingKeyId === dj.id;

              return (
              <div key={dj.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex flex-col items-start gap-6 relative group hover:border-gray-700 transition">
                 
                 <div className="w-full flex flex-col lg:flex-row items-center gap-6">
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-4 w-full lg:w-1/3">
                        <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0"
                            style={{ backgroundColor: dj.avatarColor }}
                        >
                            {dj.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-white">{dj.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                dj.role === 'Admin' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                                {dj.role}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleManagePlaylist(dj.id, dj.name, 'jingle')}
                            className="bg-gray-800 hover:bg-yellow-500 hover:text-black text-gray-300 p-3 rounded-lg font-bold border border-gray-700 flex items-center justify-center gap-2 transition"
                        >
                            <MegaphoneIcon className="w-5 h-5" />
                            Efeitos ({jingleCount})
                        </button>

                        <button 
                            onClick={() => handleManagePlaylist(dj.id, dj.name, 'music')}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-lg font-bold shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition"
                        >
                            <MusicIcon className="w-5 h-5" />
                            Músicas ({musicCount})
                        </button>
                    </div>
                 </div>

                 {/* CHAVE DE ACESSO EDITÁVEL */}
                 <div className="w-full mt-2 bg-black border border-gray-700 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col flex-1 w-full">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                            <KeyIcon className="w-3 h-3"/> Chave de Acesso (Login)
                        </span>
                        
                        {isEditingKey ? (
                             <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                 <input 
                                    type="text" 
                                    value={editKeyValue}
                                    onChange={(e) => setEditKeyValue(e.target.value)}
                                    className="bg-gray-900 border border-blue-500 rounded px-3 py-1 text-white text-2xl font-mono font-bold w-full focus:outline-none"
                                    autoFocus
                                 />
                             </div>
                        ) : (
                             <div className="font-mono text-2xl md:text-3xl font-bold tracking-widest text-green-400 select-all truncate">
                                {revealedKeys[dj.id] ? dj.accessKey : '••••••••'}
                             </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        {isEditingKey ? (
                            <>
                                <button 
                                    onClick={() => saveKey(dj)} 
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-xs font-bold uppercase transition flex items-center gap-2"
                                >
                                    <CheckIcon className="w-4 h-4" /> Salvar
                                </button>
                                <button 
                                    onClick={cancelEditingKey} 
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition flex items-center gap-2"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => toggleKeyReveal(dj.id)} 
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition border border-gray-600"
                                >
                                    {revealedKeys[dj.id] ? 'Esconder' : 'Ver Chave'}
                                </button>
                                
                                {revealedKeys[dj.id] && (
                                    <>
                                        <button 
                                            onClick={() => copyToClipboard(dj.accessKey, dj.id)}
                                            className={`px-4 py-2 rounded text-xs font-bold uppercase transition border flex items-center gap-2 ${copiedKeyId === dj.id ? 'bg-green-600 border-green-500 text-white' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'}`}
                                        >
                                            {copiedKeyId === dj.id ? <CheckIcon className="w-3 h-3" /> : null}
                                            {copiedKeyId === dj.id ? 'Copiado!' : 'Copiar'}
                                        </button>
                                        
                                        <button 
                                            onClick={() => startEditingKey(dj)} 
                                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition border border-gray-600 flex items-center gap-2"
                                            title="Editar Chave"
                                        >
                                            <PencilIcon className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                 </div>
                 
                 {/* Delete Button */}
                 <button 
                    onClick={() => onRemoveDJ(dj.id)}
                    className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    title="Remover DJ"
                 >
                    <TrashIcon className="w-5 h-5" />
                 </button>

              </div>
          )})}
      </div>
    </div>
  );
};

export default TeamManager;
