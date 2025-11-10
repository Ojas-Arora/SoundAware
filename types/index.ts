export interface SoundDetection {
  id: string;
  soundType: string;
  confidence: number;
  timestamp: Date;
  duration: number;
  audioUri?: string;
}

export interface AppSettings {
  darkMode: boolean;
  notifications: boolean;
  sensitivity: number;
  autoRecord: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export type TabParamList = {
  index: undefined;
  record: undefined;
  history: undefined;
  notifications: undefined;
  chatbot: undefined;
  settings: undefined;
};