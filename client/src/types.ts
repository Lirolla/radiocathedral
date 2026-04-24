
export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string; // URL do blob ou R2 Signed URL
  duration: number; // em segundos
  file?: File; // Referência ao arquivo local para upload
  isJingle?: boolean; // Flag para identificar se é vinheta e não contar na regra
}

export type PlaylistType = 'music' | 'jingle' | 'commercial';

export interface Playlist {
  id: string;
  ownerId?: string; // ID do DJ dono da pasta. Se undefined ou 'station', é da Rádio (Global)
  name: string;
  type: PlaylistType; // Novo campo para diferenciar músicas de vinhetas
  kind?: 'storage' | 'playlist'; // 'storage' = Pasta do Acervo (Uploads), 'playlist' = Sequência/Show (Referências)
  description?: string;
  coverUrl?: string;
  songs: Song[];
}

export interface Vote {
  id: string;
  songId: string;
  songTitle: string;
  artist: string;
  voterName: string;
  voterEmail: string;
  timestamp: string; // ISO String
}

export type MessageType = 'song_request' | 'love_story';

export interface InboxMessage {
  id: string;
  type: MessageType;
  senderName: string;
  senderEmail: string;
  content: string; // Nome da Música ou Texto da História
  extraInfo?: string; // Artista ou Dedicatória
  timestamp: string;
  read: boolean;
}

export interface DJ {
  id: string;
  name: string;
  role: 'Admin' | 'Locutor' | 'Convidado';
  status: 'offline' | 'live';
  accessKey: string; // Chave para conexão remota (OBS/WebRTC)
  streamUrl: string; // URL personalizada para o locutor
  avatarColor: string;
}

export interface ScheduleItem {
  id: string;
  playlistId: string;
  time: string; // Formato "HH:mm" ex: "12:00"
  days: number[]; // 0 = Domingo, 1 = Segunda, etc.
  isActive: boolean;
}

export interface AutoDJSettings {
  jingleInterval: number; // Tocar vinheta a cada X músicas
  enableJingles: boolean;
  
  commercialInterval: number; // Tocar comercial a cada X músicas
  enableCommercials: boolean;

  timeAnnouncementInterval: number; // Falar hora certa a cada X músicas
  enableTimeAnnouncement: boolean;
}

export interface RadioStationConfig {
  name: string;
  description: string; // Slogan curto da Home
  aboutUsText: string; // Texto longo para a aba Quem Somos
  logoUrl: string | null;
  theme: ThemeColor;
  publicTemplate?: 'template1' | 'template2'; // template1 = Tabs (Classic), template2 = One Page (Scroll)
  timezone: string; // Fuso Horário
  contact: {
    address: string;
    city: string;
    phone: string;
    whatsapp: string;
    email: string;
  }
  sponsor?: SponsorConfig;
}

export enum PlaybackMode {
  NORMAL = 'NORMAL',
  SHUFFLE = 'SHUFFLE',
  REPEAT = 'REPEAT'
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  queue: Song[];
  history: Song[];
  mode: PlaybackMode;
}

export interface AIResponse {
  text: string;
}

// Configuração de cada Parceiro
export interface Partner {
  id: string;
  active: boolean;
  name: string;
  slogan: string;
  logoUrl: string;
  link: string;
  showInBanner: boolean;
  showInHome: boolean;
  showInFooter: boolean;
  showInPage: boolean;
}

// Configuração geral de Parceiros
export interface SponsorConfig {
  partners: Partner[];
  partnerEmail: string;
  showPartnersPage: boolean;
}

// Configuração de Temas
export type ThemeColor = 'purple' | 'blue' | 'red' | 'white' | 'gold';

export type ViewState = 'dashboard' | 'acervo' | 'library' | 'team' | 'schedule' | 'jingles' | 'public_site' | 'studio' | 'settings' | 'voting' | 'messages';
