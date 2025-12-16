
import React, { useState } from 'react';
import { InboxMessage } from '../types';
import { HeartIcon, MusicIcon, EnvelopeIcon, TrashIcon, CheckIcon } from './Icons';

interface MessagesManagerProps {
  messages: InboxMessage[];
  onMarkAsRead: (id: string, currentStatus: boolean) => void;
  onDeleteMessage: (id: string) => void;
}

const MessagesManager: React.FC<MessagesManagerProps> = ({ messages, onMarkAsRead, onDeleteMessage }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'love'>('requests');

  const filteredMessages = messages.filter(msg => {
      if (activeTab === 'requests') return msg.type === 'song_request';
      if (activeTab === 'love') return msg.type === 'love_story';
      return false;
  });

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
        <header className="mb-6 shrink-0">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <EnvelopeIcon className="w-8 h-8 text-blue-400" />
                Mensagens & Interação
            </h2>
            <p className="text-gray-400">Leia os pedidos musicais e as histórias de amor enviadas pelos ouvintes.</p>
        </header>

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-1">
            <button 
                onClick={() => setActiveTab('requests')}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all relative top-1 border-t border-x ${activeTab === 'requests' ? 'bg-gray-900 border-gray-800 text-blue-400' : 'bg-transparent border-transparent text-gray-500 hover:text-white'}`}
            >
                <MusicIcon className="w-5 h-5" />
                Pedidos Musicais
            </button>
            <button 
                onClick={() => setActiveTab('love')}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all relative top-1 border-t border-x ${activeTab === 'love' ? 'bg-gray-900 border-gray-800 text-pink-500' : 'bg-transparent border-transparent text-gray-500 hover:text-white'}`}
            >
                <HeartIcon className="w-5 h-5" />
                Histórias de Amor
            </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-900 border border-gray-800 rounded-xl p-0">
            {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <EnvelopeIcon className="w-16 h-16 opacity-20 mb-4" />
                    <p className="text-lg">Caixa de entrada vazia.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-800">
                    {filteredMessages.map(msg => (
                        <div key={msg.id} className={`p-6 transition hover:bg-gray-800/50 flex gap-4 ${msg.read ? 'opacity-50' : 'bg-blue-900/10'}`}>
                            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${msg.type === 'love_story' ? 'bg-pink-500/20 text-pink-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                {msg.type === 'love_story' ? <HeartIcon className="w-6 h-6" /> : <MusicIcon className="w-6 h-6" />}
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{msg.senderName}</h4>
                                        <p className="text-xs text-gray-500">{msg.senderEmail} • {new Date(msg.timestamp).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => onMarkAsRead(msg.id, msg.read)}
                                            className={`p-2 rounded-full transition ${msg.read ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white bg-gray-800'}`}
                                            title={msg.read ? "Marcar como não lido" : "Marcar como lido"}
                                        >
                                            <CheckIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteMessage(msg.id)}
                                            className="p-2 rounded-full text-gray-400 hover:text-red-500 bg-gray-800 hover:bg-red-500/10 transition"
                                            title="Excluir"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {msg.type === 'song_request' ? (
                                    <div className="bg-black/30 p-4 rounded-lg border border-gray-700/50">
                                        <p className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-1">Pediu:</p>
                                        <p className="text-xl text-white font-bold mb-2">{msg.content}</p>
                                        {msg.extraInfo && (
                                            <p className="text-sm text-gray-300 italic">"Para: {msg.extraInfo}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-pink-900/10 p-6 rounded-lg border border-pink-500/20 relative">
                                        <HeartIcon className="absolute top-4 right-4 w-10 h-10 text-pink-500/10" />
                                        <p className="text-white text-lg leading-relaxed font-serif italic">"{msg.content}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default MessagesManager;
