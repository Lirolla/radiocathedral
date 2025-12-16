
import React, { useMemo } from 'react';
import { Vote, Playlist, Song } from '../types';
import { StarIcon, ChartIcon, UsersIcon, MusicIcon } from './Icons';
import PlaylistManager from './PlaylistManager';

interface VotingManagerProps {
  votes: Vote[];
  top10Playlist: Playlist; // A playlist oficial de candidatas
  
  // Playlist Management Props (to add songs to the voting list)
  onCreatePlaylist: (name: string, type?: any) => void; 
  onDeletePlaylist: (id: string) => void;
  onAddSongToPlaylist: (playlistId: string, song: Song) => void;
  onAddSongsToPlaylist: (playlistId: string, songs: Song[]) => Promise<void>;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  onPlayPlaylistMixed: (playlistId: string) => void;
  playlists: Playlist[]; // Needed for inner manager
}

const VotingManager: React.FC<VotingManagerProps> = ({ 
    votes, top10Playlist,
    onCreatePlaylist, onDeletePlaylist, onAddSongToPlaylist, onAddSongsToPlaylist, onRemoveSongFromPlaylist, onPlayPlaylistMixed, playlists
}) => {
  
  // Calcular Ranking
  const ranking = useMemo(() => {
      const counts: Record<string, { count: number, song: Song }> = {};
      
      // Inicializa com as músicas da playlist (mesmo com 0 votos)
      top10Playlist.songs.forEach(song => {
          counts[song.id] = { count: 0, song };
      });

      // Soma os votos
      votes.forEach(vote => {
          if (counts[vote.songId]) {
              counts[vote.songId].count++;
          }
      });

      return Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [votes, top10Playlist]);

  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map(v => v.voterEmail)).size;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
        <header className="mb-6 shrink-0">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <StarIcon className="w-8 h-8 text-yellow-500" />
                Votação & Top 10
            </h2>
            <p className="text-gray-400">Gerencie a lista de músicas para votação e veja os resultados em tempo real.</p>
        </header>

        <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden">
            
            {/* ESQUERDA: GERENCIAR PLAYLIST + RANKING */}
            <div className="xl:w-1/2 flex flex-col gap-6 overflow-y-auto pr-2">
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full">
                            <ChartIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{totalVotes}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Votos Totais</div>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{uniqueVoters}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Pessoas (Leads)</div>
                        </div>
                    </div>
                </div>

                {/* Ranking Realtime */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <StarIcon className="w-5 h-5 text-yellow-500" />
                        Ranking Atual
                    </h3>
                    <div className="space-y-2">
                        {ranking.slice(0, 5).map((item) => (
                            <div key={item.song.id} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    item.rank === 1 ? 'bg-yellow-500 text-black' : 
                                    item.rank === 2 ? 'bg-gray-400 text-black' : 
                                    item.rank === 3 ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-400'
                                }`}>
                                    {item.rank}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white truncate">{item.song.title}</div>
                                    <div className="text-xs text-gray-500 truncate">{item.song.artist}</div>
                                </div>
                                <div className="text-sm font-bold text-purple-400">{item.count} votos</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Playlist Manager (Candidatas) */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-gray-800 bg-gray-950">
                        <h3 className="font-bold text-white">Músicas Candidatas</h3>
                        <p className="text-xs text-gray-500">Adicione aqui as músicas que aparecerão no site para votação.</p>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {/* Reusing PlaylistManager but forcing it to only show the Top 10 playlist */}
                        <div className="absolute inset-0 overflow-y-auto">
                            <PlaylistManager 
                                playlists={playlists}
                                forcedPlaylist={top10Playlist}
                                onCreatePlaylist={onCreatePlaylist}
                                onDeletePlaylist={onDeletePlaylist}
                                onAddSongToPlaylist={onAddSongToPlaylist}
                                onAddSongsToPlaylist={onAddSongsToPlaylist}
                                onRemoveSongFromPlaylist={onRemoveSongFromPlaylist}
                                onPlayPlaylistMixed={onPlayPlaylistMixed}
                                isJingleMode={false}
                                stationMode={false}
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* DIREITA: LISTA DE VOTOS (LEADS) */}
            <div className="xl:w-1/2 bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-lg font-bold text-white">Registro de Votos (Leads)</h3>
                    <p className="text-sm text-gray-500">Lista completa de quem participou da votação.</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-950 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Data/Hora</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Votou em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {votes.map((vote) => (
                                <tr key={vote.id} className="hover:bg-gray-800/50">
                                    <td className="p-4 text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(vote.timestamp).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-white">{vote.voterName}</td>
                                    <td className="p-4 text-sm text-gray-300">{vote.voterEmail}</td>
                                    <td className="p-4 text-sm text-purple-400 font-bold flex items-center gap-2">
                                        <MusicIcon className="w-3 h-3" />
                                        {vote.songTitle}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
  );
};

export default VotingManager;
