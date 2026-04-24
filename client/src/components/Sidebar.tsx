
import React from 'react';
import { HomeIcon, LibraryIcon, MusicIcon, UsersIcon, CalendarIcon, MegaphoneIcon, SignalIcon, SlidersIcon, CogIcon, ArchiveIcon, StarIcon, EnvelopeIcon } from './Icons';
import { ViewState, ThemeColor } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentTheme: ThemeColor;
  userRole?: 'admin' | 'locutor' | 'public';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onChangeView, 
  currentTheme,
  userRole = 'admin'
}) => {
  
  const getThemeClasses = (theme: ThemeColor) => {
     switch(theme) {
         case 'blue': return 'text-blue-400';
         case 'red': return 'text-red-400';
         case 'white': return 'text-white';
         case 'gold': return 'text-yellow-400';
         default: return 'text-purple-400';
     }
  };

  const getActiveClasses = (view: ViewState) => {
      if (currentView !== view) return 'text-gray-400 hover:bg-gray-800/50 hover:text-white';
      
      switch(currentTheme) {
          case 'blue': return 'bg-blue-600/20 text-blue-300 border border-blue-500/20';
          case 'red': return 'bg-red-600/20 text-red-300 border border-red-500/20';
          case 'white': return 'bg-white/10 text-white border border-white/20';
          case 'gold': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20';
          default: return 'bg-purple-600/20 text-purple-300 border border-purple-500/20';
      }
  };

  if (currentView === 'public_site') {
      return null; 
  }

  // Define what Locutors can see
  const isAdmin = userRole === 'admin';

  return (
    <aside className="w-20 lg:w-72 bg-black/40 border-r border-gray-800 flex flex-col h-full flex-shrink-0 transition-all duration-300 pb-24">
      <div className="p-6 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shadow-lg shrink-0 border border-white/5`}>
          <MusicIcon className={`w-5 h-5 ${getThemeClasses(currentTheme)}`} />
        </div>
        <span className="text-xl font-bold tracking-tight hidden lg:block">
          Radio<span className={getThemeClasses(currentTheme)}>Tocai</span>
          {!isAdmin && <span className="block text-xs text-gray-500 font-normal mt-1">Área do Locutor</span>}
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 text-sm">
        
        {/* 1. Dashboard (Admin Only - Locutor uses Studio to control AutoDJ) */}
        {isAdmin && (
            <button onClick={() => onChangeView('dashboard')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('dashboard')}`}>
            <HomeIcon className="w-6 h-6 shrink-0" />
            <span className="font-medium hidden lg:block">Dashboard</span>
            </button>
        )}

        {/* 2. Estúdio (Priority for Locutor) */}
        <button onClick={() => onChangeView('studio')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('studio')}`}>
          <SlidersIcon className="w-6 h-6 shrink-0" />
          <span className="font-medium hidden lg:block">Estúdio / Mesa</span>
        </button>

        <div className="my-2 border-t border-gray-800 mx-2"></div>

        {/* 3. Programação (Admin Only) */}
        {isAdmin && (
            <button onClick={() => onChangeView('schedule')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('schedule')}`}>
            <CalendarIcon className="w-6 h-6 shrink-0" />
            <span className="font-medium hidden lg:block">Programação</span>
            </button>
        )}

        {/* 4. Acervo Musical (Everyone) */}
        <button onClick={() => onChangeView('acervo')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('acervo')}`}>
          <ArchiveIcon className="w-6 h-6 shrink-0" />
          <span className="font-medium hidden lg:block">Acervo Musical</span>
        </button>

        {/* 5. Vinhetas (Admin Only? No, DJ needs to see IDs maybe. But Playlist Manager for Jingles is complex. Let's allow but restrict creation in PlaylistManager if needed. Or just allow) */}
        {isAdmin && (
            <button onClick={() => onChangeView('jingles')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('jingles')}`}>
            <MegaphoneIcon className="w-6 h-6 shrink-0" />
            <span className="font-medium hidden lg:block">Vinhetas & Ads</span>
            </button>
        )}

        {/* 6. Playlists (Everyone) */}
        <button onClick={() => onChangeView('library')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('library')}`}>
          <LibraryIcon className="w-6 h-6 shrink-0" />
          <span className="font-medium hidden lg:block">Playlists & Shows</span>
        </button>

        <div className="my-2 border-t border-gray-800 mx-2"></div>

        {/* 7. Votação (Admin Only usually, but let's hide for simplicity) */}
        {isAdmin && (
            <button onClick={() => onChangeView('voting')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('voting')}`}>
            <StarIcon className="w-6 h-6 shrink-0" />
            <span className="font-medium hidden lg:block">Votação & Enquetes</span>
            </button>
        )}

        {/* 8. Mensagem (Everyone needs to see requests) */}
        <button onClick={() => onChangeView('messages')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('messages')}`}>
          <EnvelopeIcon className="w-6 h-6 shrink-0" />
          <span className="font-medium hidden lg:block">Mensagens & Pedidos</span>
        </button>

        {/* 9. Equipe (Admin Only) */}
        {isAdmin && (
            <button onClick={() => onChangeView('team')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('team')}`}>
            <UsersIcon className="w-6 h-6 shrink-0" />
            <span className="font-medium hidden lg:block">Equipe & DJs</span>
            </button>
        )}

        <div className="my-4 border-t border-gray-800 mx-2"></div>

        {/* 10. Config (Admin Only) */}
        {isAdmin && (
            <button onClick={() => onChangeView('settings')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${getActiveClasses('settings')}`}>
            <CogIcon className="w-6 h-6 shrink-0" />
            <span className="font-medium hidden lg:block">Configurações</span>
            </button>
        )}

        {/* 11. Ver Site */}
        <button
            onClick={() => onChangeView('public_site')}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-white hover:bg-gray-800 group mt-2 whitespace-nowrap"
        >
            <SignalIcon className="w-6 h-6 shrink-0 text-green-400 group-hover:animate-pulse" />
            <span className="font-bold hidden lg:block">
                {isAdmin ? 'Ver Site Oficial' : 'Sair / Logout'}
            </span>
        </button>

      </nav>
    </aside>
  );
};

export default Sidebar;
