import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  t: (key: string, options?: any) => string;
  availableLanguages: { code: string; name: string; nativeName: string }[];
  translateText: (text: string, targetLanguage: string) => Promise<string>;
}

const translations = {
  en: {
    // App Name
    appName: 'SoundAware',
    
    // Navigation
    home: 'Home',
    record: 'Record',
    history: 'History',
    notifications: 'Alerts',
    chatbot: 'AI Chat',
    settings: 'Settings',
    
    // Home Screen
    homeTitle: 'Sound Monitor',
    homeSubtitle: 'AI-powered household sound detection',
    activelyMonitoring: 'Actively Monitoring',
    monitoringPaused: 'Monitoring Paused',
    today: 'Today',
    accuracy: 'Accuracy',
    total: 'Total',
    quickActions: 'Quick Actions',
    startRecording: 'Start Recording',
    viewAlerts: 'View Alerts',
    recentDetections: 'Recent Detections',
    noDetectionsYet: 'No detections yet. Start recording to see results!',
    
    // Record Screen
    recordTitle: 'Sound Recording',
    recordSubtitle: 'Record audio to classify household sounds',
    tapToStart: 'Tap to start recording',
    recording: 'Recording...',
    processing: 'Processing...',
    lastDetection: 'Last Detection',
    uploadAudioFile: 'Upload Audio File',
    analyzePreRecorded: 'Analyze pre-recorded audio files',
    chooseFile: 'Choose File',
    audioControls: 'Audio Controls',
    playLast: 'Play Last',
    pause: 'Pause',
    
    // History Screen
    historyTitle: 'Detection History',
    totalDetections: 'total detections',
    exportCsv: 'Export CSV',
    share: 'Share',
    clearHistory: 'Clear History',
    showStatistics: 'Show Statistics',
    hideStatistics: 'Hide Statistics',
    detectionStatistics: 'Detection Statistics',
    avgConfidence: 'Avg Confidence',
    mostCommon: 'Most Common',
    
    // Notifications
    notificationsTitle: 'Notifications',
    unreadNotifications: 'unread notifications',
    clearAll: 'Clear All',
    noNotifications: 'No Notifications',
    seeAlertsHere: 'You\'ll see alerts and updates here',
    
    // Settings
    settingsTitle: 'Settings',
    customizeExperience: 'Customize your sound detection experience',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    toggleThemes: 'Toggle between light and dark themes',
    audioDetection: 'Audio & Detection',
    autoRecording: 'Auto Recording',
    autoStart: 'Automatically start recording on app launch',
    sensitivity: 'Sensitivity',
    detectionLevel: 'Detection sensitivity level',
    pushNotifications: 'Push Notifications',
    receiveAlerts: 'Receive alerts for important sounds',
    language: 'Language',
    selectLanguage: 'Select your preferred language',
    mlModel: 'ML Model Configuration',
    modelSettings: 'Model Settings',
    confidenceThreshold: 'Confidence Threshold',
    minimumConfidence: 'Minimum confidence for valid detections',
    preprocessing: 'Audio Preprocessing',
    enablePreprocessing: 'Enable audio preprocessing for better accuracy',
    postprocessing: 'Result Postprocessing',
    enablePostprocessing: 'Enable result postprocessing and filtering',
    advancedSettings: 'Advanced Settings',
    showAdvanced: 'Show Advanced',
    hideAdvanced: 'Hide Advanced',
    batchSize: 'Batch Size',
    processingBatch: 'Audio processing batch size',
    maxDuration: 'Max Duration',
    maximumAudio: 'Maximum audio duration (seconds)',
    sampleRate: 'Sample Rate',
    audioSample: 'Audio sample rate (Hz)',
    aboutSupport: 'About & Support',
    version: 'Version',
    privacy: 'Privacy',
    allLocal: 'All processing is local',
    platform: 'Platform',
    resetSettings: 'Reset Settings',
    getHelp: 'Get Help',
    
    // AI Chat
    aiAssistant: 'AI Assistant',
    askAboutSound: 'Ask me about sound classification',
    aiTyping: 'AI is typing...',
    askAnything: 'Ask me anything...',
    
    // Common
    all: 'All',
    none: 'None',
    yes: 'Yes',
    no: 'No',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    reset: 'Reset',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    
    // Export/Share
    exportSuccess: 'Export Successful',
    exportFailed: 'Export Failed',
    shareSuccess: 'Share Prepared',
    shareFailed: 'Share Failed',
    csvExported: 'CSV file exported successfully',
    summaryShared: 'Detection summary prepared for sharing',
  },
  
  hi: {
    // App Name
    appName: 'SoundAware',
    
    // Navigation
    home: 'होम',
    record: 'रिकॉर्ड',
    history: 'इतिहास',
    notifications: 'अलर्ट',
    chatbot: 'AI चैट',
    settings: 'सेटिंग्स',
    
    // Home Screen
    homeTitle: 'ध्वनि मॉनिटर',
    homeSubtitle: 'AI-संचालित घरेलू ध्वनि पहचान',
    activelyMonitoring: 'सक्रिय निगरानी',
    monitoringPaused: 'निगरानी रुकी हुई',
    today: 'आज',
    accuracy: 'सटीकता',
    total: 'कुल',
    quickActions: 'त्वरित कार्य',
    startRecording: 'रिकॉर्डिंग शुरू करें',
    viewAlerts: 'अलर्ट देखें',
    recentDetections: 'हाल की पहचान',
    noDetectionsYet: 'अभी तक कोई पहचान नहीं। परिणाम देखने के लिए रिकॉर्डिंग शुरू करें!',
    
    // Record Screen
    recordTitle: 'ध्वनि रिकॉर्डिंग',
    recordSubtitle: 'घरेलू ध्वनियों को वर्गीकृत करने के लिए ऑडियो रिकॉर्ड करें',
    tapToStart: 'रिकॉर्डिंग शुरू करने के लिए टैप करें',
    recording: 'रिकॉर्ड हो रहा है...',
    processing: 'प्रसंस्करण...',
    lastDetection: 'अंतिम पहचान',
    uploadAudioFile: 'ऑडियो फ़ाइल अपलोड करें',
    analyzePreRecorded: 'पूर्व-रिकॉर्ड की गई ऑडियो फ़ाइलों का विश्लेषण करें',
    chooseFile: 'फ़ाइल चुनें',
    audioControls: 'ऑडियो नियंत्रण',
    playLast: 'अंतिम चलाएं',
    pause: 'रोकें',
    
    // History Screen
    historyTitle: 'पहचान इतिहास',
    totalDetections: 'कुल पहचान',
    exportCsv: 'CSV निर्यात करें',
    share: 'साझा करें',
    clearHistory: 'इतिहास साफ़ करें',
    showStatistics: 'आंकड़े दिखाएं',
    hideStatistics: 'आंकड़े छुपाएं',
    detectionStatistics: 'पहचान आंकड़े',
    avgConfidence: 'औसत विश्वास',
    mostCommon: 'सबसे आम',
    
    // Settings
    settingsTitle: 'सेटिंग्स',
    customizeExperience: 'अपने ध्वनि पहचान अनुभव को अनुकूलित करें',
    appearance: 'दिखावट',
    darkMode: 'डार्क मोड',
    toggleThemes: 'हल्के और गहरे थीम के बीच टॉगल करें',
    language: 'भाषा',
    selectLanguage: 'अपनी पसंदीदा भाषा चुनें',
    resetSettings: 'सेटिंग्स रीसेट करें',
    getHelp: 'सहायता प्राप्त करें',
    
    // Common
    all: 'सभी',
    none: 'कोई नहीं',
    yes: 'हाँ',
    no: 'नहीं',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    save: 'सेव करें',
    reset: 'रीसेट करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    close: 'बंद करें',
    
    // Export/Share
    exportSuccess: 'निर्यात सफल',
    exportFailed: 'निर्यात असफल',
    shareSuccess: 'साझाकरण तैयार',
    shareFailed: 'साझाकरण असफल',
    csvExported: 'CSV फ़ाइल सफलतापूर्वक निर्यात की गई',
    summaryShared: 'पहचान सारांश साझाकरण के लिए तैयार',
  },

  pa: {
    // Punjabi translations
    appName: 'SoundAware',
    home: 'ਘਰ',
    record: 'ਰਿਕਾਰਡ',
    history: 'ਇਤਿਹਾਸ',
    notifications: 'ਅਲਰਟ',
    chatbot: 'AI ਚੈਟ',
    settings: 'ਸੈਟਿੰਗਜ਼',
    homeTitle: 'ਆਵਾਜ਼ ਮਾਨੀਟਰ',
    startRecording: 'ਰਿਕਾਰਡਿੰਗ ਸ਼ੁਰੂ ਕਰੋ',
    exportCsv: 'CSV ਐਕਸਪੋਰਟ',
    share: 'ਸਾਂਝਾ ਕਰੋ',
    resetSettings: 'ਸੈਟਿੰਗਜ਼ ਰੀਸੈਟ ਕਰੋ',
    getHelp: 'ਮਦਦ ਲਓ',
  },

  gu: {
    // Gujarati translations
    appName: 'SoundAware',
    home: 'ઘર',
    record: 'રેકોર્ડ',
    history: 'ઇતિહાસ',
    notifications: 'અલર્ટ',
    chatbot: 'AI ચેટ',
    settings: 'સેટિંગ્સ',
    homeTitle: 'અવાજ મોનિટર',
    startRecording: 'રેકોર્ડિંગ શરૂ કરો',
    exportCsv: 'CSV એક્સપોર્ટ',
    share: 'શેર કરો',
    resetSettings: 'સેટિંગ્સ રીસેટ કરો',
    getHelp: 'મદદ મેળવો',
  },

  ta: {
    // Tamil translations
    appName: 'SoundAware',
    home: 'வீடு',
    record: 'பதிவு',
    history: 'வரலாறு',
    notifications: 'எச்சரிக்கைகள்',
    chatbot: 'AI அரட்டை',
    settings: 'அமைப்புகள்',
    homeTitle: 'ஒலி கண்காணிப்பு',
    startRecording: 'பதிவு தொடங்கு',
    exportCsv: 'CSV ஏற்றுமதி',
    share: 'பகிர்',
    resetSettings: 'அமைப்புகளை மீட்டமை',
    getHelp: 'உதவி பெறு',
  },

  te: {
    // Telugu translations
    appName: 'SoundAware',
    home: 'ఇల్లు',
    record: 'రికార్డ్',
    history: 'చరిత్ర',
    notifications: 'హెచ్చరికలు',
    chatbot: 'AI చాట్',
    settings: 'సెట్టింగులు',
    homeTitle: 'ధ్వని పర్యవేక్షణ',
    startRecording: 'రికార్డింగ్ ప్రారంభించు',
    exportCsv: 'CSV ఎగుమతి',
    share: 'భాగస్వామ్యం',
    resetSettings: 'సెట్టింగులను రీసెట్ చేయి',
    getHelp: 'సహాయం పొందండి',
  },

  bn: {
    // Bengali translations
    appName: 'SoundAware',
    home: 'বাড়ি',
    record: 'রেকর্ড',
    history: 'ইতিহাস',
    notifications: 'সতর্কতা',
    chatbot: 'AI চ্যাট',
    settings: 'সেটিংস',
    homeTitle: 'শব্দ মনিটর',
    startRecording: 'রেকর্ডিং শুরু করুন',
    exportCsv: 'CSV রপ্তানি',
    share: 'শেয়ার',
    resetSettings: 'সেটিংস রিসেট',
    getHelp: 'সাহায্য নিন',
  },

  mr: {
    // Marathi translations
    appName: 'SoundAware',
    home: 'घर',
    record: 'रेकॉर्ड',
    history: 'इतिहास',
    notifications: 'अलर्ट',
    chatbot: 'AI चॅट',
    settings: 'सेटिंग्ज',
    homeTitle: 'आवाज मॉनिटर',
    startRecording: 'रेकॉर्डिंग सुरू करा',
    exportCsv: 'CSV निर्यात',
    share: 'शेअर',
    resetSettings: 'सेटिंग्ज रीसेट करा',
    getHelp: 'मदत घ्या',
  },
};

const i18n = new I18n(translations);

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  ];

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_language');
      if (saved) {
        setCurrentLanguage(saved);
        i18n.locale = saved;
      } else {
        // Use the correct property from expo-localization
        const deviceLocale = Localization.getLocales()[0]?.languageTag || 'en';
        const deviceLanguage = deviceLocale.split('-')[0];
        const supportedLanguage = availableLanguages.find(lang => lang.code === deviceLanguage)?.code || 'en';
        setCurrentLanguage(supportedLanguage);
        i18n.locale = supportedLanguage;
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  const setLanguage = async (language: string) => {
    setCurrentLanguage(language);
    i18n.locale = language;
    try {
      await AsyncStorage.setItem('app_language', language);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    // Mock Google Translate API implementation
    // In production, you would use actual Google Translate API
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock translation based on target language
      const mockTranslations: { [key: string]: { [key: string]: string } } = {
        'hi': {
          'Hello': 'नमस्ते',
          'How are you?': 'आप कैसे हैं?',
          'Thank you': 'धन्यवाद',
          'Good morning': 'सुप्रभात',
          'Good evening': 'शुभ संध्या',
        },
        'pa': {
          'Hello': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
          'How are you?': 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?',
          'Thank you': 'ਧੰਨਵਾਦ',
        },
        'gu': {
          'Hello': 'નમસ્તે',
          'How are you?': 'તમે કેમ છો?',
          'Thank you': 'આભાર',
        },
      };

      return mockTranslations[targetLanguage]?.[text] || text;
    } catch (error) {
      console.log('Translation error:', error);
      return text;
    }
  };

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setLanguage,
      t,
      availableLanguages,
      translateText,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}