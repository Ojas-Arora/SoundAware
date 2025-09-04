import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SoundDetection } from '@/types';
import { AppState } from 'react-native';

interface SoundDetectionContextType {
  detections: SoundDetection[];
  addDetection: (detection: Omit<SoundDetection, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  autoRecording: boolean;
  setAutoRecording: (auto: boolean) => void;
  stopAutoRecording: () => void;
}

const SoundDetectionContext = createContext<SoundDetectionContextType | undefined>(undefined);

export function SoundDetectionProvider({ children }: { children: React.ReactNode }) {
  const [detections, setDetections] = useState<SoundDetection[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [autoRecording, setAutoRecording] = useState(false);

  useEffect(() => {
    loadDetections();
    loadAutoRecordingSetting();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' && autoRecording) {
        setIsRecording(false);
      } else if (nextAppState === 'active' && autoRecording) {
        setTimeout(() => setIsRecording(true), 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [autoRecording]);

  // Watch for autoRecording changes and update recording state
  useEffect(() => {
    if (autoRecording) {
      setTimeout(() => setIsRecording(true), 1000);
    } else {
      setIsRecording(false);
    }
  }, [autoRecording]);

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

  const loadAutoRecordingSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('auto_recording');
      if (saved) {
        const autoRecordingEnabled = JSON.parse(saved);
        setAutoRecording(autoRecordingEnabled);
        if (autoRecordingEnabled) {
          setTimeout(() => setIsRecording(true), 2000);
        }
      }
    } catch (error) {
      console.log('Error loading auto recording setting:', error);
    }
  };

  const updateAutoRecording = async (enabled: boolean) => {
    setAutoRecording(enabled);
    try {
      await AsyncStorage.setItem('auto_recording', JSON.stringify(enabled));
      if (!enabled) {
        setIsRecording(false);
      } else {
        setTimeout(() => setIsRecording(true), 1000);
      }
    } catch (error) {
      console.log('Error saving auto recording setting:', error);
    }
  };

  const stopAutoRecording = () => {
    setAutoRecording(false);
    setIsRecording(false);
    AsyncStorage.setItem('auto_recording', JSON.stringify(false));
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
      autoRecording,
      setAutoRecording: updateAutoRecording,
      stopAutoRecording,
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