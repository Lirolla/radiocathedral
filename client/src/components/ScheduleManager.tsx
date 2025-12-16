import React, { useState } from 'react';
import { ScheduleItem, Playlist } from '../types';
import { ClockIcon, PlusIcon, TrashIcon, CalendarIcon } from './Icons';

interface ScheduleManagerProps {
  schedule: ScheduleItem[];
  playlists: Playlist[];
  onAddSchedule: (item: Omit<ScheduleItem, 'id'>) => void;
  onRemoveSchedule: (id: string) => void;
  onToggleSchedule: (id: string) => void;
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ 
  schedule, 
  playlists, 
  onAddSchedule, 
  onRemoveSchedule,
  onToggleSchedule 
}) => {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [time, setTime] = useState('12:00');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  
  // New: Filter View State
  const [viewDay, setViewDay] = useState<number | null>(null); // null means 'Todos'

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex].sort()
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlaylistId && time && selectedDays.length > 0) {
      
      // Validação de Conflito de Horário
      const hasConflict = schedule.some(item => {
          // Verifica se é o mesmo horário
          if (item.time === time) {
              // Verifica se há sobreposição de dias
              const hasDayOverlap = item.days.some(day => selectedDays.includes(day));
              if (hasDayOverlap) return true;
          }
          return false;
      });

      if (hasConflict) {
          alert(`Erro: Já existe uma programação agendada às ${time} para um ou mais dias selecionados.`);
          return;
      }

      onAddSchedule({
        playlistId: selectedPlaylistId,
        time,
        days: selectedDays,
        isActive: true
      });
      // Reset form partially
      setSelectedDays([]);
    } else {
        alert("Preencha o horário, a playlist e selecione pelo menos um dia.");
    }
  };

  // 1. Sort schedule by time
  const sortedSchedule = [...schedule].sort((a, b) => a.time.localeCompare(b.time));

  // 2. Filter by selected View Day
  const filteredSchedule = sortedSchedule.filter(item => {
    if (viewDay === null) return true;
    return item.days.includes(viewDay);
  });

  return (
    <div className="h-full p-6 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Grade de Programação</h2>
        <p className="text-gray-400">Agende horários para o Auto DJ mudar a playlist automaticamente.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column: Form */}
          <div className="xl:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-purple-400" />
                    Novo Agendamento
                </h3>
                
                <form onSubmit={handleAdd} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 uppercase">Horário de Início</label>
                            <input 
                                type="time" 
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 uppercase">Playlist (Programa)</label>
                            <select 
                                value={selectedPlaylistId}
                                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="">Selecione uma lista...</option>
                                {playlists.filter(p => p.type === 'music').map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-2 uppercase">Repetir nos dias:</label>
                        <div className="grid grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => toggleDay(index)}
                                    className={`px-1 py-2 rounded text-xs font-bold transition ${
                                        selectedDays.includes(index)
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                            <button 
                                type="button"
                                onClick={() => setSelectedDays([0,1,2,3,4,5,6])}
                                className="col-span-1 px-1 py-2 rounded text-xs font-bold border border-gray-700 text-gray-400 hover:text-white"
                            >
                                TODOS
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 mt-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Adicionar
                    </button>
                </form>
            </div>
          </div>

          {/* Right Column: Schedule List with Filters */}
          <div className="xl:col-span-2">
             
             {/* Day Tabs */}
             <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                 <button
                    onClick={() => setViewDay(null)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                        viewDay === null 
                        ? 'bg-white text-black' 
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                 >
                    Visão Geral
                 </button>
                 {DAYS_OF_WEEK.map((day, idx) => (
                     <button
                        key={idx}
                        onClick={() => setViewDay(idx)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                            viewDay === idx 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                     >
                        {day}
                     </button>
                 ))}
             </div>

             <div className="space-y-4">
                {viewDay !== null && filteredSchedule.length > 0 && (
                     <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 mb-4">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Visualizando apenas: <strong>{DAYS_OF_WEEK[viewDay]}</strong>. Verifique se há buracos entre os horários.</span>
                     </div>
                )}

                {filteredSchedule.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                        <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nada agendado {viewDay !== null ? `para ${DAYS_OF_WEEK[viewDay]}` : ''}.</p>
                        <p className="text-sm mt-1">Utilize o formulário ao lado para criar a grade.</p>
                    </div>
                ) : (
                    filteredSchedule.map((item, index) => {
                        const playlist = playlists.find(p => p.id === item.playlistId);

                        return (
                            <div key={item.id} className="relative">
                                {/* Timeline Connector */}
                                {viewDay !== null && index !== filteredSchedule.length - 1 && (
                                    <div className="absolute left-[3.2rem] top-12 bottom-[-1rem] w-0.5 bg-gray-800 z-0"></div>
                                )}

                                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 hover:border-gray-700 transition relative z-10">
                                    <div className="bg-gray-950 px-4 py-3 rounded-lg text-2xl font-mono font-bold text-white border border-gray-800 min-w-[110px] text-center shadow-lg">
                                        {item.time}
                                    </div>
                                    
                                    <div className="flex-1 text-center md:text-left">
                                        <h4 className="font-bold text-lg text-white">{playlist?.name || "Playlist Removida"}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1 justify-center md:justify-start">
                                            {/* If viewing all, show tags. If viewing day, show 'Every week' */}
                                            {viewDay === null ? (
                                                DAYS_OF_WEEK.map((day, idx) => (
                                                    <span key={idx} className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                                        item.days.includes(idx) 
                                                        ? 'bg-purple-500/20 text-purple-300' 
                                                        : 'text-gray-800 text-gray-600'
                                                    }`}>
                                                        {day.charAt(0)}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                    Recorrente toda semana
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
                                        <button 
                                            onClick={() => onToggleSchedule(item.id)}
                                            className={`text-xs font-bold px-3 py-1 rounded-full border transition ${
                                                item.isActive 
                                                ? 'border-green-500 text-green-400 bg-green-500/10' 
                                                : 'border-gray-600 text-gray-500 bg-gray-800'
                                            }`}
                                        >
                                            {item.isActive ? 'ATIVO' : 'PAUSADO'}
                                        </button>

                                        <button 
                                            onClick={() => onRemoveSchedule(item.id)}
                                            className="p-2 text-gray-600 hover:text-red-500 transition hover:bg-red-500/10 rounded-full"
                                            title="Excluir Horário"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
             </div>
          </div>
      </div>
    </div>
  );
};

export default ScheduleManager;