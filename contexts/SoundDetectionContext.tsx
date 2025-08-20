import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SoundDetection } from '@/types';

interface SoundDetectionContextType {
  detections: SoundDetection[];
  addDetection: (detection: Omit<SoundDetection, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

const SoundDetectionContext = createContext<SoundDetectionContextType | undefined>(undefined);

export function SoundDetectionProvider({ children }: { children: React.ReactNode }) {
  const [detections, setDetections] = useState<SoundDetection[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadDetections();
  }, []);

  const loadDetections = async () => {
    try {
      const savedDetections = await AsyncStorage.getItem('sound_detections');
      if (savedDetections) {
        const parsed = JSON.parse(savedDetections);
        setDetections(parsed.map((d: any) => ({ ...d, timestamp: new Date(d.timestamp) })));
      }
    } catch (error) {
      console.log('Error loading detections:', error);
    }
  };

  const addDetection = async (detection: Omit<SoundDetection, 'id' | 'timestamp'>) => {
    const newDetection: SoundDetection = {
      ...detection,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    const updatedDetections = [newDetection, ...detections].slice(0, 100); // Keep last 100
    setDetections(updatedDetections);

    try {
      await AsyncStorage.setItem('sound_detections', JSON.stringify(updatedDetections));
    } catch (error) {
      console.log('Error saving detection:', error);
    }
  };

  const clearHistory = async () => {
    setDetections([]);
    try {
      await AsyncStorage.removeItem('sound_detections');
    } catch (error) {
      console.log('Error clearing history:', error);
    }
  };

  return (
    <SoundDetectionContext.Provider value={{
      detections,
      addDetection,
      clearHistory,
      isRecording,
      setIsRecording,
    }}>
      {children}
    </SoundDetectionContext.Provider>
  );
}

export function useSoundDetection() {
  const context = useContext(SoundDetectionContext);
  if (context === undefined) {
    throw new Error('useSoundDetection must be used within a SoundDetectionProvider');
  }
  return context;
}