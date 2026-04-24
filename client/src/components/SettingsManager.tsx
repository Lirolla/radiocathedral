
import React, { useRef, useState } from 'react';
import { RadioStationConfig, ThemeColor, Playlist, SponsorConfig, Partner } from '../types';
import { CogIcon, UploadIcon, BoltIcon, ClockIcon, SignalIcon, ArchiveIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from './Icons';
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
  const partnerLogoInputRef = useRef<HTMLInputElement>(null);
  const [testStatus, setTestStatus] = useState<{msg: string, success: boolean} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [newPartner, setNewPartner] = useState<Partial<Partner> | null>(null);

  const getPartners = (): Partner[] => config.sponsor?.partners || [];

  const savePartners = (partners: Partner[]) => {
    handleChange('sponsor', { ...(config.sponsor || { partnerEmail: '', showPartnersPage: true }), partners } as SponsorConfig);
  };

  const handleAddPartner = () => {
    setNewPartner({ id: Date.now().toString(), active: true, name: '', slogan: '', logoUrl: '', link: '', showInBanner: false, showInHome: true, showInFooter: true, showInPage: true });
  };

  const handleSaveNewPartner = () => {
    if (!newPartner?.name) return;
    savePartners([...getPartners(), newPartner as Partner]);
    setNewPartner(null);
  };

  const handleDeletePartner = (id: string) => {
    savePartners(getPartners().filter(p => p.id !== id));
  };

  const handleTogglePartner = (id: string) => {
    savePartners(getPartners().map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleUpdatePartner = (id: string, field: keyof Partner, value: any) => {
    savePartners(getPartners().map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handlePartnerLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, partnerId: string | null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (partnerId) {
        handleUpdatePartner(partnerId, 'logoUrl', reader.result as string);
      } else if (newPartner) {
        setNewPartner(prev => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

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
                  <div className="grid grid-cols-5 gap-3">
                      {[
                        { id: 'purple', bg: '#9333ea', label: 'Roxo' },
                        { id: 'blue',   bg: '#2563eb', label: 'Azul' },
                        { id: 'red',    bg: '#dc2626', label: 'Vermelho' },
                        { id: 'white',  bg: '#e5e7eb', label: 'Branco' },
                        { id: 'gold',   bg: '#eab308', label: 'Dourado' },
                      ].map(({ id, bg, label }) => (
                          <button
                            key={id}
                            onClick={() => handleChange('theme', id as ThemeColor)}
                            title={label}
                            className={`h-10 rounded-lg border-2 transition flex items-center justify-center ${
                                config.theme === id
                                ? 'border-white scale-105'
                                : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: bg }}
                          >
                             {config.theme === id && <span className="text-black/60 text-lg">●</span>}
                          </button>
                      ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Seleccione o tema de cores do site público. O tema <strong>Dourado</strong> usa fundo preto com detalhes dourados.</p>
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

            {/* 3. PARCEIROS / PATROCINADORES */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-1 border-b border-gray-800 pb-2 flex items-center gap-2">
                    ⭐ Parceiros & Patrocinadores
                </h3>
                <p className="text-xs text-gray-500 mb-5">Gerencie múltiplos parceiros e defina onde cada um aparece no site.</p>

                {/* Configurações gerais */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300 font-medium">Exibir página de Parceiros no menu</span>
                    <button
                        onClick={() => handleChange('sponsor', { ...(config.sponsor || { partners: [], partnerEmail: '' }), showPartnersPage: !(config.sponsor?.showPartnersPage) } as SponsorConfig)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${ config.sponsor?.showPartnersPage ? 'bg-yellow-500' : 'bg-gray-700' }`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${ config.sponsor?.showPartnersPage ? 'left-7' : 'left-1' }`} />
                    </button>
                </div>
                <div className="mb-5">
                    <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Email para &quot;Seja Nosso Parceiro&quot;</label>
                    <input
                        type="email"
                        value={config.sponsor?.partnerEmail || ''}
                        onChange={(e) => handleChange('sponsor', { ...(config.sponsor || { partners: [], showPartnersPage: true }), partnerEmail: e.target.value } as SponsorConfig)}
                        placeholder="parcerias@radiocathedral.com"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                    />
                </div>

                {/* Lista de Parceiros */}
                <div className="space-y-3 mb-4">
                    {getPartners().map((partner) => (
                        <div key={partner.id} className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                    {partner.logoUrl ? <img src={partner.logoUrl} alt={partner.name} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-600">Logo</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm truncate">{partner.name || 'Sem nome'}</p>
                                    <p className="text-gray-500 text-xs truncate">{partner.slogan}</p>
                                </div>
                                <button
                                    onClick={() => handleTogglePartner(partner.id)}
                                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${ partner.active ? 'bg-yellow-500' : 'bg-gray-700' }`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${ partner.active ? 'left-5' : 'left-0.5' }`} />
                                </button>
                                <button onClick={() => setEditingPartnerId(editingPartnerId === partner.id ? null : partner.id)} className="text-gray-500 hover:text-yellow-400 transition"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleDeletePartner(partner.id)} className="text-gray-500 hover:text-red-400 transition"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                            {editingPartnerId === partner.id && (
                                <div className="border-t border-gray-800 pt-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Nome</label>
                                            <input type="text" value={partner.name} onChange={(e) => handleUpdatePartner(partner.id, 'name', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Slogan</label>
                                            <input type="text" value={partner.slogan} onChange={(e) => handleUpdatePartner(partner.id, 'slogan', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Link</label>
                                        <input type="text" value={partner.link} onChange={(e) => handleUpdatePartner(partner.id, 'link', e.target.value)} placeholder="https://..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Logo</label>
                                        <div className="flex items-center gap-3">
                                            {partner.logoUrl && <img src={partner.logoUrl} alt="" className="w-10 h-10 rounded object-contain bg-gray-900" />}
                                            <input type="file" accept="image/*" ref={partnerLogoInputRef} className="hidden" onChange={(e) => handlePartnerLogoUpload(e, partner.id)} />
                                            <button onClick={() => partnerLogoInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"><UploadIcon className="w-3 h-3" /> Carregar</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Onde aparece</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {([
                                                { field: 'showInBanner', label: 'Banner flutuante' },
                                                { field: 'showInHome', label: 'Card na Home' },
                                                { field: 'showInFooter', label: 'Rodapé' },
                                                { field: 'showInPage', label: 'Página Parceiros' },
                                            ] as { field: keyof Partner; label: string }[]).map(({ field, label }) => (
                                                <label key={String(field)} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={!!partner[field]} onChange={(e) => handleUpdatePartner(partner.id, field, e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                                                    <span className="text-xs text-gray-300">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Formulário novo parceiro */}
                {newPartner ? (
                    <div className="bg-gray-950 border border-yellow-500/30 rounded-xl p-4 space-y-3">
                        <p className="text-xs text-yellow-400 font-bold uppercase">Novo Parceiro</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Nome *</label>
                                <input type="text" value={newPartner.name || ''} onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })} placeholder="Nome do parceiro" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Slogan</label>
                                <input type="text" value={newPartner.slogan || ''} onChange={(e) => setNewPartner({ ...newPartner, slogan: e.target.value })} placeholder="Frase curta" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Link</label>
                            <input type="text" value={newPartner.link || ''} onChange={(e) => setNewPartner({ ...newPartner, link: e.target.value })} placeholder="https://..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500" />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Logo</label>
                            <div className="flex items-center gap-3">
                                {newPartner.logoUrl && <img src={newPartner.logoUrl} alt="" className="w-10 h-10 rounded object-contain bg-gray-900" />}
                                <input type="file" accept="image/*" ref={partnerLogoInputRef} className="hidden" onChange={(e) => handlePartnerLogoUpload(e, null)} />
                                <button onClick={() => partnerLogoInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"><UploadIcon className="w-3 h-3" /> Carregar Logo</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Onde aparece</label>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { field: 'showInBanner', label: 'Banner flutuante' },
                                    { field: 'showInHome', label: 'Card na Home' },
                                    { field: 'showInFooter', label: 'Rodapé' },
                                    { field: 'showInPage', label: 'Página Parceiros' },
                                ] as { field: keyof Partner; label: string }[]).map(({ field, label }) => (
                                    <label key={String(field)} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!newPartner[field as keyof typeof newPartner]} onChange={(e) => setNewPartner({ ...newPartner, [field]: e.target.checked })} className="accent-yellow-500 w-4 h-4" />
                                        <span className="text-xs text-gray-300">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={handleSaveNewPartner} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition"><CheckIcon className="w-4 h-4" />Salvar Parceiro</button>
                            <button onClick={() => setNewPartner(null)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"><XMarkIcon className="w-4 h-4" />Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleAddPartner} className="w-full border-2 border-dashed border-gray-700 hover:border-yellow-500/50 text-gray-500 hover:text-yellow-400 rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition">
                        <PlusIcon className="w-4 h-4" /> Adicionar Parceiro
                    </button>
                )}
            </div>

            {/* 4. TIMEZONE & BACKUP & DIAGNOSTIC */}
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
