import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MLModelSettings {
  modelVersion: string;
  sensitivity: number;
  confidenceThreshold: number;
  enablePreprocessing: boolean;
  enablePostprocessing: boolean;
  batchSize: number;
  maxDuration: number;
  sampleRate: number;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  inferenceTime: number;
  lastUpdated: Date;
}

interface PredictionResult {
  soundType: string;
  confidence: number;
  duration: number;
  alternatives?: Array<{ soundType: string; confidence: number }>;
}

interface MLModelContextType {
  modelSettings: MLModelSettings;
  updateModelSettings: (settings: Partial<MLModelSettings>) => void;
  modelPerformance: ModelPerformance;
  processAudio: (audioUri: string, sensitivity?: number) => Promise<PredictionResult>;
  isModelLoaded: boolean;
  loadModel: () => Promise<void>;
  resetModel: () => void;
}

const defaultSettings: MLModelSettings = {
  modelVersion: 'v2.1.0',
  sensitivity: 0.7,
  confidenceThreshold: 0.6,
  enablePreprocessing: true,
  enablePostprocessing: true,
  batchSize: 32,
  maxDuration: 30,
  sampleRate: 44100,
};

const defaultPerformance: ModelPerformance = {
  accuracy: 0.89,
  precision: 0.87,
  recall: 0.91,
  f1Score: 0.89,
  inferenceTime: 150,
  lastUpdated: new Date(),
};

const MLModelContext = createContext<MLModelContextType | undefined>(undefined);

export function MLModelProvider({ children }: { children: React.ReactNode }) {
  const [modelSettings, setModelSettings] = useState<MLModelSettings>(defaultSettings);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance>(defaultPerformance);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
    loadModel();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('ml_model_settings');
      if (saved) {
        setModelSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.log('Error loading ML settings:', error);
    }
  };

  const updateModelSettings = async (newSettings: Partial<MLModelSettings>) => {
    const updated = { ...modelSettings, ...newSettings };
    setModelSettings(updated);
    
    try {
      await AsyncStorage.setItem('ml_model_settings', JSON.stringify(updated));
      
      // Real-time performance simulation based on settings
      const performanceImpact = {
        accuracy: updated.enablePreprocessing && updated.enablePostprocessing ? 0.02 : -0.01,
        inferenceTime: updated.batchSize > 64 ? 50 : -20,
      };
      
      setModelPerformance(prev => ({
        ...prev,
        accuracy: Math.min(0.99, Math.max(0.70, prev.accuracy + performanceImpact.accuracy)),
        inferenceTime: Math.max(50, prev.inferenceTime + performanceImpact.inferenceTime),
        lastUpdated: new Date(),
      }));
    } catch (error) {
      console.log('Error saving ML settings:', error);
    }
  };

  const loadModel = async () => {
    // Simulate model loading
    setTimeout(() => {
      setIsModelLoaded(true);
    }, 1000);
  };

  const processAudio = async (audioUri: string, sensitivity?: number): Promise<PredictionResult> => {
    const startTime = Date.now();
    
    // Simulate ML processing with realistic delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const effectiveSensitivity = sensitivity || modelSettings.sensitivity;
    
    // Enhanced mock predictions with more variety
    const soundCategories = {
      kitchen: ['Microwave Beep', 'Kitchen Timer', 'Boiling Water', 'Blender', 'Coffee Maker', 'Dishwasher'],
      security: ['Doorbell', 'Door Knock', 'Window Break', 'Car Alarm', 'Motion Sensor'],
      appliances: ['Washing Machine', 'Vacuum Cleaner', 'Air Conditioner', 'Dryer Cycle', 'Garbage Disposal'],
      pets: ['Dog Bark', 'Cat Meow', 'Bird Chirping', 'Hamster Wheel'],
      emergency: ['Smoke Alarm', 'Carbon Monoxide Alarm', 'Fire Alarm', 'Security Siren'],
      communication: ['Phone Ring', 'Text Message', 'Video Call', 'Notification Sound'],
      ambient: ['Running Water', 'Footsteps', 'Door Closing', 'Chair Moving', 'Paper Rustling']
    };
    
    const allSounds = Object.values(soundCategories).flat();
    const primarySound = allSounds[Math.floor(Math.random() * allSounds.length)];
    
    // Adjust confidence based on sensitivity
    let baseConfidence = 0.6 + Math.random() * 0.35;
    if (effectiveSensitivity > 0.8) baseConfidence += 0.1;
    if (effectiveSensitivity < 0.5) baseConfidence -= 0.1;
    
    const confidence = Math.min(0.99, Math.max(0.3, baseConfidence));
    
    // Generate alternative predictions
    const alternatives = allSounds
      .filter(sound => sound !== primarySound)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map(sound => ({
        soundType: sound,
        confidence: Math.random() * (confidence - 0.1)
      }));
    
    const inferenceTime = Date.now() - startTime;
    
    // Update performance metrics
    setModelPerformance(prev => ({
      ...prev,
      inferenceTime,
      lastUpdated: new Date(),
    }));
    
    return {
      soundType: primarySound,
      confidence,
      duration: 2 + Math.random() * 8,
      alternatives,
    };
  };

  const resetModel = async () => {
    setModelSettings(defaultSettings);
    setModelPerformance(defaultPerformance);
    try {
      await AsyncStorage.removeItem('ml_model_settings');
    } catch (error) {
      console.log('Error resetting ML settings:', error);
    }
  };

  return (
    <MLModelContext.Provider value={{
      modelSettings,
      updateModelSettings,
      modelPerformance,
      processAudio,
      isModelLoaded,
      loadModel,
      resetModel,
    }}>
      {children}
    </MLModelContext.Provider>
  );
}

export function useMLModel() {
  const context = useContext(MLModelContext);
  if (context === undefined) {
    throw new Error('useMLModel must be used within a MLModelProvider');
  }
  return context;
}