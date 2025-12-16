import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import { MusicIcon, UsersIcon } from './Icons';

interface DashboardProps {
  currentSong: Song | null;
  nextSong: Song | null;
  isAutoDJ: boolean;
  onToggleAutoDJ: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  currentSong, 
  nextSong, 
  isAutoDJ,
  onToggleAutoDJ
}) => {
  // Audiência Real (Sem Simulação)
  // Em um sistema real conectado ao backend, isso viria via WebSocket/API
  const [listeners, setListeners] = useState(0);
  const [peak, setPeak] = useState(0);

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
      <header>
        <h2 className="text-3xl font-bold text-white mb-1">No Ar</h2>
        <p className="text-gray-400">Monitoramento em tempo real do estúdio</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Main Now Playing Card */}
        <div className="col-span-1 lg:col-span-2 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-64 h-64 shrink-0 rounded-2xl bg-gray-800 shadow-2xl flex items-center justify-center border border-gray-700/50">
               {currentSong ? (
                 <div className="w-full h-full bg-gradient-to-tr from-indigo-900 to-purple-800 flex flex-col items-center justify-center rounded-2xl">
                    <MusicIcon className="w-24 h-24 text-white/30 animate-pulse" />
                 </div>
               ) : (
                 <MusicIcon className="w-20 h-20 text-gray-600" />
               )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Ao Vivo
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                {currentSong?.title || "Estúdio em Silêncio"}
              </h1>
              <p className="text-xl md:text-2xl text-purple-400 mb-6">
                {currentSong?.artist || "Aguardando Programação"}
              </p>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-800/50 pt-6">
                 <div>
                    <span className="block text-gray-500 text-xs uppercase">Próxima Faixa</span>
                    <span className="text-gray-300 font-medium truncate block">
                      {nextSong ? nextSong.title : "..."}
                    </span>
                 </div>
                 <div>
                    <span className="block text-gray-500 text-xs uppercase">Qualidade</span>
                    <span className="text-purple-300 font-medium">HQ Stereo</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* AUDIENCE / LISTENERS STATS */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-bold">Audiência Real</h3>
                </div>
                <span className="text-xs text-green-500 font-mono">● Online</span>
             </div>

             <div className="flex items-end gap-2 mb-4">
                 <span className="text-6xl font-black text-white tracking-tighter">{listeners.toLocaleString()}</span>
                 <span className="text-gray-400 font-medium mb-2">ouvintes</span>
             </div>

             {/* Graph Placeholder (Flat because 0 listeners) */}
             <div className="h-16 flex items-end justify-between gap-1 mb-4 opacity-50 border-b border-gray-700">
                 {/* Sem dados de audiência */}
                 <div className="w-full text-center text-xs text-gray-600 py-4">Aguardando dados do servidor de streaming...</div>
             </div>

             <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 border-t border-gray-800 pt-4">
                 <div className="flex justify-between">
                     <span>Pico (Hoje)</span>
                     <span className="text-white font-bold">{peak.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                     <span>Apps/Mobile</span>
                     <span className="text-white font-bold">0%</span>
                 </div>
             </div>
        </div>

        {/* BIG AUTO DJ TOGGLE */}
        <div className={`border rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${isAutoDJ ? 'bg-green-900/10 border-green-500/30' : 'bg-gray-900/30 border-gray-800'}`}>
           <h3 className="text-lg font-bold text-gray-300 uppercase tracking-widest">Sistema Auto DJ</h3>
           
           <button 
             onClick={onToggleAutoDJ}
             className={`w-full py-6 rounded-xl font-black text-2xl tracking-wider transition-all shadow-xl transform active:scale-95 flex flex-col items-center gap-2
                 ${isAutoDJ 
                    ? 'bg-green-600 text-white shadow-green-900/50 hover:bg-green-500' 
                    : 'bg-gray-700 text-gray-400 shadow-black/50 hover:bg-gray-600 hover:text-white'
                 }`}
           >
              <span>{isAutoDJ ? 'ATIVADO' : 'DESATIVADO'}</span>
              <span className="text-xs font-normal opacity-70">
                 {isAutoDJ ? 'Tocando playlist automaticamente' : 'Clique para ativar a automação'}
              </span>
           </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;