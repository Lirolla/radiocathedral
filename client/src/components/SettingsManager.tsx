
import React, { useRef, useState } from 'react';
import { RadioStationConfig, ThemeColor, Playlist } from '../types';
import { CogIcon, UploadIcon, BoltIcon, ClockIcon, SignalIcon, ArchiveIcon } from './Icons';
import { testFirebaseConnection, savePlaylist } from '../services/dbService';

interface SettingsManagerProps {
  config: RadioStationConfig;
  onUpdateConfig: (newConfig: RadioStationConfig) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  config, 
  onUpdateConfig,
  onExportBackup,
  onImportBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [testStatus, setTestStatus] = useState<{msg: string, success: boolean} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);

  const handleChange = (field: keyof RadioStationConfig, value: any) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  const handleContactChange = (field: keyof RadioStationConfig['contact'], value: string) => {
    onUpdateConfig({
      ...config,
      contact: { ...config.contact, [field]: value }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunTest = async () => {
      setIsTesting(true);
      setTestStatus(null);
      const result = await testFirebaseConnection();
      setTestStatus({ msg: result.message, success: result.success });
      setIsTesting(false);
  };

  const handleCreateDefaults = async () => {
      if (!confirm("Isso criará as pastas padrão de sistema (Vinhetas, Comerciais e Lista de Backup) caso elas não existam. Deseja continuar?")) return;
      
      setIsCreatingDefaults(true);
      try {
        const defaults: Playlist[] = [
            { id: 'jingles-default', name: 'Vinhetas da Rádio', type: 'jingle', kind: 'storage', songs: [], ownerId: 'station' },
            { id: 'commercials-default', name: 'Comerciais & Ads', type: 'commercial', kind: 'storage', songs: [], ownerId: 'station' },
            { id: 'backup-playlist-default', name: 'Lista de Backup (Segurança)', type: 'music', kind: 'storage', songs: [], ownerId: 'station' }
        ];

        for (const p of defaults) {
            await savePlaylist(p);
        }
        alert("Sucesso! Pastas de sistema verificadas.");
      } catch (error: any) {
        console.error(error);
        alert("Erro ao criar pastas: " + error.message);
      } finally {
        setIsCreatingDefaults(false);
      }
  };

  const timezones = [
      'America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza',
      'America/Recife', 'America/Cuiaba', 'America/Campo_Grande', 'America/Rio_Branco',
      'Europe/Lisbon', 'Europe/London', 'America/New_York'
  ];

  return (
    <div className="h-full p-6 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <CogIcon className="w-8 h-8 text-gray-400" />
            Configurações da Rádio
        </h2>
        <p className="text-gray-400">Gerencie a identidade visual, informações de contato e dados do sistema.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
          
          {/* 1. IDENTIDADE VISUAL */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-2">Identidade Visual</h3>
              
              <div className="mb-6">
                 <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Logo da Estação</label>
                 <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden relative group">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-xs text-gray-600">Sem Logo</span>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <button onClick={() => handleChange('logoUrl', null)} className="text-xs text-red-400 hover:text-white">Remover</button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={logoInputRef} 
                            className="hidden" 
                            onChange={handleLogoUpload} 
                        />
                        <button 
                            onClick={() => logoInputRef.current?.click()}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition mb-2"
                        >
                            <UploadIcon className="w-4 h-4" />
                            Carregar Logo
                        </button>
                        <p className="text-[10px] text-gray-500">Recomendado: PNG Transparente (500x500px)</p>
                    </div>
                 </div>
              </div>

              <div className="mb-6">
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Nome da Rádio</label>
                  <input 
                    type="text" 
                    value={config.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
              </div>

              <div className="mb-6">
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Layout do Site Público</label>
                  <select 
                    value={config.publicTemplate || 'template1'}
                    onChange={(e) => handleChange('publicTemplate', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                      <option value="template1">Template 1 - Clássico (Navegação por Abas)</option>
                      <option value="template2">Template 2 - Moderno (Página Única / Scroll)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-2">
                      Template 1 troca de tela ao clicar. Template 2 rola a página para baixo mostrando tudo (One Page).
                  </p>
              </div>

              <div className="mb-6">
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Tema de Cores</label>
                  <div className="grid grid-cols-4 gap-4">
                      {['purple', 'blue', 'red', 'white'].map((color) => (
                          <button
                            key={color}
                            onClick={() => handleChange('theme', color as ThemeColor)}
                            className={`h-10 rounded-lg border-2 transition ${
                                config.theme === color 
                                ? 'border-white scale-105' 
                                : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: color === 'white' ? '#e5e7eb' : `var(--color-${color}-600, ${color})` }}
                          >
                             {config.theme === color && <div className="w-full h-full flex items-center justify-center text-black/50">●</div>}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="mb-6">
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Slogan / Descrição Curta (Home)</label>
                  <input 
                    type="text"
                    value={config.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm"
                    placeholder="Ex: A melhor música, 24h por dia."
                  />
              </div>

              <div>
                  <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Texto "Quem Somos" (Bio Completa)</label>
                  <textarea 
                    value={config.aboutUsText || ''}
                    onChange={(e) => handleChange('aboutUsText', e.target.value)}
                    rows={6}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none text-sm"
                    placeholder="Conte a história da rádio, missão e valores. Aparecerá em uma aba dedicada."
                  />
              </div>
          </div>

          {/* 2. CONTATO E LOCALIZAÇÃO & SISTEMA */}
          <div className="flex flex-col gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-2">Contato & Localização</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Cidade / Estado</label>
                        <input 
                            type="text" 
                            value={config.contact.city}
                            onChange={(e) => handleContactChange('city', e.target.value)}
                            placeholder="Ex: São Paulo, SP"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Telefone</label>
                        <input 
                            type="text" 
                            value={config.contact.phone}
                            onChange={(e) => handleContactChange('phone', e.target.value)}
                            placeholder="(00) 0000-0000"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Endereço Completo</label>
                    <input 
                        type="text" 
                        value={config.contact.address}
                        onChange={(e) => handleContactChange('address', e.target.value)}
                        placeholder="Rua Exemplo, 123 - Centro"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-xs text-gray-500 uppercase font-bold mb-2">WhatsApp (Link ou Número)</label>
                    <input 
                        type="text" 
                        value={config.contact.whatsapp}
                        onChange={(e) => handleContactChange('whatsapp', e.target.value)}
                        placeholder="5511999999999"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Email de Contato</label>
                    <input 
                        type="email" 
                        value={config.contact.email}
                        onChange={(e) => handleContactChange('email', e.target.value)}
                        placeholder="contato@radio.com"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            {/* 3. TIMEZONE & BACKUP & DIAGNOSTIC */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-2">Sistema</h3>
                
                <div className="mb-6">
                    <label className="block text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        Fuso Horário da Estação
                    </label>
                    <select
                        value={config.timezone || 'America/Sao_Paulo'}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    >
                        {timezones.map((tz) => (
                            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* CONNECTION TESTER & INITIALIZER */}
                <div className="mb-6 bg-black/30 p-4 rounded-lg border border-gray-700 space-y-4">
                    
                    {/* Teste de Conexão */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                <SignalIcon className="w-4 h-4" /> Status da Conexão
                            </span>
                            <button 
                                onClick={handleRunTest}
                                disabled={isTesting}
                                className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white"
                            >
                                {isTesting ? 'Testando...' : 'Testar Agora'}
                            </button>
                        </div>
                        {testStatus && (
                            <div className={`text-xs p-2 rounded border ${testStatus.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                {testStatus.msg}
                            </div>
                        )}
                    </div>

                    {/* Criar Pastas Padrão (Manualmente) */}
                    <div className="pt-4 border-t border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                <ArchiveIcon className="w-4 h-4" /> Inicialização
                            </span>
                             <button 
                                onClick={handleCreateDefaults}
                                disabled={isCreatingDefaults}
                                className="text-xs bg-gray-700 hover:bg-white hover:text-black px-3 py-1 rounded text-white border border-gray-600 transition"
                            >
                                {isCreatingDefaults ? 'Criando...' : 'Verificar Pastas'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            Use isto se as pastas "Vinhetas", "Comerciais" ou "Lista de Backup" não apareceram no menu.
                        </p>
                    </div>

                </div>

                {/* SAVE BUTTON FOR PREFERENCES */}
                 <div className="mb-6">
                    <button 
                        onClick={() => alert('Configurações salvas com sucesso!')}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition"
                    >
                        <CogIcon className="w-5 h-5" />
                        Salvar Preferências
                    </button>
                 </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-gray-800">
                    <div>
                        <p className="text-sm text-gray-500">Backup e Restauração</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onExportBackup}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm"
                        >
                            <BoltIcon className="w-4 h-4" />
                            Exportar
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm"
                        >
                            <UploadIcon className="w-4 h-4" />
                            Restaurar
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={(e) => e.target.files?.[0] && onImportBackup(e.target.files[0])} 
                        />
                    </div>
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default SettingsManager;
