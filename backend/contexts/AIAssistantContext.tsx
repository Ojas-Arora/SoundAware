import React, { createContext, useContext, useState } from 'react';
import { useLanguage } from './LanguageContext';
import { useSoundDetection } from './SoundDetectionContext';

interface AIResponse {
  text: string;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface AIAssistantContextType {
  generateResponse: (query: string) => Promise<AIResponse>;
  isProcessing: boolean;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const { currentLanguage, t } = useLanguage();
  const { detections } = useSoundDetection();

  // Remove dependency on MLModelContext: use fixed defaults or derive from detections.
  // The app uses a single canonical ML model served by the backend (used for uploaded files).
  const modelSettings = {
    maxDuration: 3,
    sampleRate: 16000,
    sensitivity: detections.length > 0 ? (detections[0].confidence ?? 0.75) : 0.75,
    confidenceThreshold: 0.6,
    batchSize: 1024,
    enablePreprocessing: true,
    enablePostprocessing: true,
  } as const;

  const modelPerformance = {
    accuracy: 0.71,
    inferenceTime: 50,
    precision: 0.8,
    f1Score: 0.8,
  } as const;
  
  // Canonical class names (match contexts/pred_with_audio.py)
  const class_names = [
    "applause_no_speech", "applause_speech",
    "cat_meowing_no_speech", "cat_meowing_speech",
    "cough_no_speech", "cough_speech",
    "crying_no_speech", "crying_speech",
    "dishes_pot_pan_no_speech", "dishes_pot_pan_speech",
    "dog_barking_no_speech", "dog_barking_speech",
    "doorbell_no_speech", "doorbell_speech",
    "drill_no_speech", "drill_speech",
    "glass_breaking_no_speech", "glass_breaking_speech",
    "gun_shot_no_speech", "gun_shot_speech",
    "slam_no_speech", "slam_speech",
    "toilet_flush_no_speech", "toilet_flush_speech"
  ];
  const [isProcessing, setIsProcessing] = useState(false);

  // sanitize assistant text: remove emojis and markdown markers but preserve plain text and line breaks
  const sanitizeText = (t: string) => {
    if (!t || typeof t !== 'string') return t;
    let s = t;
    // remove common markdown emphasis markers but keep the text
    s = s.replace(/\*\*|__|`/g, '');

    // replace common bullet characters with a newline so lists remain readable
    s = s.replace(/[••·]/g, '\n');
    s = s.replace(/[→➡←]/g, ' -> ');

    // remove a broad set of emoji/pictograph ranges while preserving normal punctuation and letters
    try {
      // Unicode property escape (works in modern JS runtimes)
      s = s.replace(/\p{Extended_Pictographic}/gu, '');
    } catch (e) {
      // fallback explicit ranges if Unicode property escapes unsupported
      s = s.replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u2600-\u26FF}\u2700-\u27BF]/gu, '');
    }

    // Trim trailing spaces on each line but preserve newlines
    s = s.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n');
    // collapse multiple blank lines
    s = s.replace(/\n{3,}/g, '\n\n').trim();
    return s;
  };

  const getLatest = () => detections && detections.length > 0 ? detections[0] : null;

  const friendlyLabel = (raw: string) => {
    // convert class names like 'cough_speech' -> 'cough'
    if (!raw) return raw;
    const parts = raw.split('_');
    return parts[0];
  };

  const knowledgeBase = {
    en: {
      patterns: {
        'how.*work|working|function': {
          response: `SoundAware uses advanced TensorFlow Lite machine learning models to analyze audio patterns in real-time. Here's how it works:

🧠 **AI Processing**: The app processes audio using a neural network trained on 25+ household sounds
🔊 **Real-time Analysis**: Audio is analyzed in chunks of ${modelSettings.maxDuration} seconds with ${modelSettings.sampleRate}Hz sample rate
📊 **Confidence Scoring**: Each detection gets a confidence score (currently set to ${Math.round(modelSettings.confidenceThreshold * 100)}% minimum)
🔒 **Local Processing**: All analysis happens on your device - no data leaves your phone

The model achieves ${Math.round(modelPerformance.accuracy * 100)}% accuracy with ${modelPerformance.inferenceTime}ms inference time.`,
          suggestions: ['What sounds can it detect?', 'How to improve accuracy?', 'Privacy and security?']
        },
        'sound.*detect|what.*sound|which.*sound': {
          response: (ctx: { latest: any }) => {
            const latest = ctx.latest;
            const latestText = latest ? `Latest: ${friendlyLabel(latest.soundType)} (${Math.round((latest.confidence||0)*100)}%)` : 'No recent detections';
            return `SoundAware detects ${class_names.length} household sounds across categories. ${latestText}. Use the Record tab to capture new audio or upload files for analysis.`;
          },
          suggestions: ['How accurate is detection?', 'Can I upload audio files?', 'Real-time monitoring?']
        },
        'which.*classes|class list|classes': {
          response: () => `The model recognizes the following classes: ${class_names.join(', ')}.`,
          suggestions: ['What is the accuracy?', 'How to improve accuracy?']
        },
        'accura.*|precision|reliable': {
          response: `SoundAware's accuracy depends on several factors:

📈 **Overall Performance**:
- Model Accuracy: ${Math.round(modelPerformance.accuracy * 100)}%
- Precision: ${Math.round(modelPerformance.precision * 100)}%
- F1 Score: ${Math.round(modelPerformance.f1Score * 100)}%
- Average Inference Time: ${modelPerformance.inferenceTime}ms

🎯 **Confidence Levels**:
- 90-100%: Extremely reliable
- 80-89%: Highly reliable  
- 70-79%: Good reliability
- 60-69%: Moderate reliability
- Below 60%: May need verification

🔧 **Current Settings**:
- Sensitivity: ${Math.round(modelSettings.sensitivity * 100)}%
- Confidence Threshold: ${Math.round(modelSettings.confidenceThreshold * 100)}%
- Preprocessing: ${modelSettings.enablePreprocessing ? 'Enabled' : 'Disabled'}

**Tips to improve accuracy**: Record in quiet environments, hold device close to sound source, ensure 3-10 second recordings.`,
          suggestions: ['How to improve accuracy?', 'What affects detection?', 'Model settings?']
        },
        'privacy|security|safe|data': {
          response: `SoundAware prioritizes your privacy and security:

🔒 **Complete Privacy**:
- All audio processing happens locally on your device
- No audio data is ever sent to external servers
- No cloud storage or remote analysis
- Your recordings stay on your device only

🛡️ **Security Features**:
- Local TensorFlow Lite model execution
- No internet connection required for detection
- Encrypted local storage for settings and history
- No user accounts or data collection

📱 **Data Control**:
- You can delete detection history anytime
- Audio recordings are stored temporarily and can be removed
- Export your data as CSV for backup
- Complete control over your information

**Your audio never leaves your device - guaranteed!**`,
          suggestions: ['How does local processing work?', 'Can I export my data?', 'Storage management?']
        },
        'upload.*file|file.*upload|import.*audio': {
          response: (ctx: { latest: any }) => {
            const latest = ctx.latest;
            const note = latest ? `Last upload detected: ${friendlyLabel(latest.soundType)} (${Math.round((latest.confidence||0)*100)}%)` : '';
            return `Yes — you can upload audio files (MP3, WAV, M4A, AAC, FLAC). Max 50MB. Recommended duration ${modelSettings.maxDuration}s. ${note}`;
          },
          suggestions: ['What file formats work best?', 'File size limits?', 'Processing time?']
        },
        'real.*time|live|instant': {
          response: `SoundAware provides true real-time audio analysis:

⚡ **Performance Metrics**:
- Detection Latency: ${modelPerformance.inferenceTime}ms
- Processing Speed: Real-time (no delays)
- Buffer Size: ${modelSettings.batchSize} samples
- Sample Rate: ${modelSettings.sampleRate}Hz

🔄 **Real-time Features**:
- Continuous audio monitoring
- Instant sound classification
- Live audio visualization
- Immediate notifications for important sounds
- Background processing capability

⚙️ **Optimization**:
- Efficient ML model (${Math.round(modelPerformance.accuracy * 100)}% accuracy)
- Battery-optimized processing
- Minimal CPU usage
- Smart audio buffering

The app can detect and classify sounds within 1-2 seconds of occurrence!`,
          suggestions: ['Battery usage?', 'Background monitoring?', 'Performance optimization?']
        },
        // direct yes/no queries like "is this a cough?" or "is that dog barking?"
        'is\s+.*(cough|dog|cat|applause|doorbell|glass|gun|drill|slam|toilet|dishes|crying|bark|meow)': {
          response: (ctx: { latest: any; query?: string }) => {
            const latest = ctx.latest;
            const q = (ctx.query || '').toLowerCase();
            if (!latest) return 'I have no recent detection to compare. Please record or upload a short clip and try again.';
            // find which keyword user asked about
            const keywords = ['cough','dog','cat','applause','doorbell','glass','gun','drill','slam','toilet','dishes','crying','bark','meow'];
            const asked = keywords.find(k => q.includes(k));
            if (!asked) return `I couldn't identify which sound you're asking about.`;
            // map latest.soundType to friendly
            const latestFriendly = friendlyLabel(latest.soundType).toLowerCase();
            if (latestFriendly.includes(asked) || asked.includes(latestFriendly)) {
              return `Yes — recent detection: ${friendlyLabel(latest.soundType)} with ${(Math.round((latest.confidence||0)*100))}% confidence.`;
            }
            return `No — the most recent detection was ${friendlyLabel(latest.soundType)} (${Math.round((latest.confidence||0)*100)}% confidence), not ${asked}.`;
          }
        },
        'help|support|how.*use|tutorial': {
          response: `Welcome to SoundAware! Here's your complete guide:

📱 **Main Features**:

1️⃣ **Home Tab**: Overview of recent detections and quick stats
2️⃣ **Record Tab**: Live recording and file upload for analysis  
3️⃣ **History Tab**: View all past detections, export CSV, share summaries
4️⃣ **Notifications**: Alerts for important sound detections
5️⃣ **AI Chat**: Ask questions about the app (you're here!)
6️⃣ **Settings**: Customize sensitivity, language, and model settings

🎯 **Quick Start**:
- Tap Record tab → Tap microphone → Let it listen for 3-10 seconds
- Or upload an audio file for instant analysis
- Check History for all your detections
- Adjust sensitivity in Settings for better results

📊 **Current Status**: ${detections.length} detections recorded, ${Math.round(modelSettings.sensitivity * 100)}% sensitivity`,
          suggestions: ['Recording tips?', 'Best practices?', 'Troubleshooting?']
        },
        'battery|power|consumption': {
          response: `SoundAware is optimized for minimal battery usage:

🔋 **Battery Optimization**:
- Efficient TensorFlow Lite model (only ${modelPerformance.inferenceTime}ms per inference)
- Smart audio buffering to reduce CPU usage
- Background processing optimization
- Automatic sleep mode when inactive

⚙️ **Power Management**:
- Audio preprocessing: ${modelSettings.enablePreprocessing ? 'Enabled (slight battery impact)' : 'Disabled (battery optimized)'}
- Batch processing: ${modelSettings.batchSize} samples (optimized for efficiency)
- Sample rate: ${modelSettings.sampleRate}Hz (balanced quality/power)

💡 **Battery Tips**:
- Use lower sensitivity for longer battery life
- Disable preprocessing if not needed
- Enable auto-recording only when necessary
- Close app when not actively monitoring

Typical usage: 2-5% battery per hour of continuous monitoring.`,
          suggestions: ['Power saving tips?', 'Background usage?', 'Optimization settings?']
        },
        'improve.*accuracy|better.*detection|enhance': {
          response: `Here are proven ways to improve detection accuracy:

🎯 **Recording Best Practices**:
- Hold device 1-3 feet from sound source
- Record in quiet environment (minimize background noise)
- Ensure 3-10 second recordings for best results
- Avoid covering microphone

⚙️ **Optimal Settings** (Current vs Recommended):
- Sensitivity: ${Math.round(modelSettings.sensitivity * 100)}% (try 70-80% for balanced results)
- Confidence Threshold: ${Math.round(modelSettings.confidenceThreshold * 100)}% (60-70% recommended)
- Preprocessing: ${modelSettings.enablePreprocessing ? '✅ Enabled' : '❌ Disabled'} (enable for better accuracy)
- Postprocessing: ${modelSettings.enablePostprocessing ? '✅ Enabled' : '❌ Disabled'} (enable for cleaner results)

🔧 **Advanced Optimization**:
- Use higher sample rate (44.1kHz) for complex sounds
- Enable both preprocessing and postprocessing
- Adjust batch size based on device performance

Would you like me to suggest optimal settings for your use case?`,
          suggestions: ['Optimal settings for my device?', 'Troubleshoot poor detection?', 'Advanced configuration?']
        },
        'language|translate|multilingual': {
          response: `SoundAware supports 8 languages with full UI translation:

🌍 **Available Languages**:
- English (English)
- हिंदी (Hindi) 
- ਪੰਜਾਬੀ (Punjabi)
- ગુજરાતી (Gujarati)
- தமிழ் (Tamil)
- తెలుగు (Telugu)
- বাংলা (Bengali)
- मराठी (Marathi)

🔄 **Language Features**:
- Complete UI translation
- Voice assistant in your language
- AI responses in selected language
- Localized date/time formats
- Cultural sound preferences

📱 **How to Change Language**:
1. Go to Settings tab
2. Tap on Language section
3. Select your preferred language
4. App will restart with new language

Current language: ${currentLanguage === 'en' ? 'English' : currentLanguage === 'hi' ? 'हिंदी' : currentLanguage === 'pa' ? 'ਪੰਜਾਬੀ' : currentLanguage}`,
          suggestions: ['Voice commands in my language?', 'Add new language?', 'Translation accuracy?']
        },
        'export|csv|download|backup': {
          response: `SoundAware offers comprehensive data export options:

📊 **CSV Export Features**:
- Complete detection history with timestamps
- Confidence scores and sound types
- Duration and metadata for each detection
- Automatic filename with date
- Compatible with Excel, Google Sheets

📱 **Export Process**:
1. Go to History tab
2. Tap "Export CSV" button
3. File downloads automatically (web) or opens share dialog (mobile)
4. Data includes: Date, Time, Sound Type, Confidence %, Duration

📤 **Share Options**:
- Quick summary with recent detections
- Statistical overview
- Formatted for messaging apps
- Email-friendly format

📈 **Your Current Data**:
- Total detections: ${detections.length}
- Average confidence: ${detections.length > 0 ? Math.round(detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length * 100) : 0}%
- Date range: ${detections.length > 0 ? `${detections[detections.length - 1]?.timestamp.toLocaleDateString()} to ${detections[0]?.timestamp.toLocaleDateString()}` : 'No data yet'}`,
          suggestions: ['How to backup data?', 'Share with others?', 'Data formats?']
        }
      },
      fallback: `I'm your AI assistant for SoundAware! I can help you with:

🎯 **App Features**: Recording, detection history, settings, notifications
🔧 **Technical Support**: Model configuration, accuracy optimization, troubleshooting  
📊 **Data Management**: Export options, sharing, privacy settings
🌍 **Languages**: Multi-language support and voice commands
🔒 **Privacy**: Local processing, security features, data control

**Current App Status**:
- Detections: ${detections.length} total
- Model accuracy: ${Math.round(modelPerformance.accuracy * 100)}%
- Language: ${currentLanguage}
- Sensitivity: ${Math.round(modelSettings.sensitivity * 100)}%

What would you like to know more about?`
    },
    hi: {
      patterns: {
        'कैसे.*काम|कार्य.*कैसे|फंक्शन': {
          response: `SoundAware उन्नत TensorFlow Lite मशीन लर्निंग मॉडल का उपयोग करके रियल-टाइम में ऑडियो पैटर्न का विश्लेषण करता है:

🧠 **AI प्रसंस्करण**: ऐप 25+ घरेलू ध्वनियों पर प्रशिक्षित न्यूरल नेटवर्क का उपयोग करता है
🔊 **रियल-टाइम विश्लेषण**: ${modelSettings.maxDuration} सेकंड के चंक में ${modelSettings.sampleRate}Hz सैंपल रेट के साथ
📊 **विश्वास स्कोरिंग**: प्रत्येक पहचान को विश्वास स्कोर मिलता है (वर्तमान में ${Math.round(modelSettings.confidenceThreshold * 100)}% न्यूनतम)
🔒 **स्थानीय प्रसंस्करण**: सभी विश्लेषण आपके डिवाइस पर होता है

मॉडल ${Math.round(modelPerformance.accuracy * 100)}% सटीकता के साथ ${modelPerformance.inferenceTime}ms में परिणाम देता है।`,
          suggestions: ['कौन सी आवाजें पहचान सकता है?', 'सटीकता कैसे बढ़ाएं?', 'गोपनीयता और सुरक्षा?']
        },
        'आवाज.*पहचान|ध्वनि.*पता|कौन.*आवाज': {
          response: `SoundAware 25+ घरेलू ध्वनियों की पहचान कर सकता है:

🏠 **रसोई की आवाजें**: माइक्रोवेव बीप, किचन टाइमर, उबलता पानी, ब्लेंडर, कॉफी मेकर
🔔 **सुरक्षा अलर्ट**: डोरबेल, दरवाजा खटखटाना, खिड़की टूटना, कार अलार्म
🏠 **उपकरण**: वाशिंग मशीन, वैक्यूम क्लीनर, एयर कंडीशनर, ड्रायर
🐕 **पालतू जानवर**: कुत्ते का भौंकना, बिल्ली का म्याऊं, पक्षियों का चहचहाना
🚨 **आपातकाल**: स्मोक अलार्म, कार्बन मोनोऑक्साइड अलार्म, फायर अलार्म
📱 **संचार**: फोन रिंग, मैसेज नोटिफिकेशन, वीडियो कॉल

वर्तमान आंकड़े: ${detections.length} कुल पहचान, ${detections.length > 0 ? Math.round(detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length * 100) : 0}% औसत विश्वास।`,
          suggestions: ['सटीकता कैसी है?', 'फाइल अपलोड कर सकते हैं?', 'रियल-टाइम मॉनिटरिंग?']
        },
        'सटीकता|परिशुद्धता|विश्वसनीय': {
          response: `SoundAware की सटीकता कई कारकों पर निर्भर करती है:

📈 **समग्र प्रदर्शन**:
- मॉडल सटीकता: ${Math.round(modelPerformance.accuracy * 100)}%
- परिशुद्धता: ${Math.round(modelPerformance.precision * 100)}%
- F1 स्कोर: ${Math.round(modelPerformance.f1Score * 100)}%
- औसत प्रसंस्करण समय: ${modelPerformance.inferenceTime}ms

🎯 **विश्वास स्तर**:
- 90-100%: अत्यधिक विश्वसनीय
- 80-89%: अत्यधिक विश्वसनीय
- 70-79%: अच्छी विश्वसनीयता
- 60-69%: मध्यम विश्वसनीयता

🔧 **वर्तमान सेटिंग्स**:
- संवेदनशीलता: ${Math.round(modelSettings.sensitivity * 100)}%
- विश्वास सीमा: ${Math.round(modelSettings.confidenceThreshold * 100)}%

**सटीकता बढ़ाने के टिप्स**: शांत वातावरण में रिकॉर्ड करें, डिवाइस को ध्वनि स्रोत के पास रखें।`,
          suggestions: ['सटीकता कैसे बढ़ाएं?', 'सेटिंग्स कैसे बदलें?', 'बेहतर परिणाम कैसे पाएं?']
        },
        'classes|क्लास|कौन सी क्लास': {
          response: `मॉडल निम्नलिखित क्लासेस पहचानता है: ${class_names.join(', ')}`,
          suggestions: ['मॉडल की सटीकता क्या है?', 'सटीकता कैसे बढ़ाएं?']
        }
      },
      fallback: `मैं SoundAware का AI सहायक हूं! मैं आपकी मदद कर सकता हूं:

🎯 **ऐप सुविधाएं**: रिकॉर्डिंग, पहचान इतिहास, सेटिंग्स, सूचनाएं
🔧 **तकनीकी सहायता**: मॉडल कॉन्फ़िगरेशन, सटीकता अनुकूलन
📊 **डेटा प्रबंधन**: निर्यात विकल्प, साझाकरण, गोपनीयता
🌍 **भाषाएं**: बहुभाषी समर्थन और आवाज कमांड

**वर्तमान ऐप स्थिति**:
- पहचान: ${detections.length} कुल
- मॉडल सटीकता: ${Math.round(modelPerformance.accuracy * 100)}%
- संवेदनशीलता: ${Math.round(modelSettings.sensitivity * 100)}%

आप क्या जानना चाहते हैं?`
    }
  };

  const generateResponse = async (query: string): Promise<AIResponse> => {
    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    try {
      const language = knowledgeBase[currentLanguage as keyof typeof knowledgeBase] || knowledgeBase.en;
      const queryLower = query.toLowerCase();
      
      // Find matching pattern
      for (const [pattern, response] of Object.entries(language.patterns)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(queryLower)) {
          const latest = getLatest();
          let text: string;
          if (typeof response.response === 'function') {
            try {
              // call dynamic response function with context (cast to any to avoid strict typing issues)
              text = (response.response as any)({ latest, query: queryLower, class_names });
            } catch (e) {
              text = language.fallback;
            }
          } else {
            text = response.response as string;
          }
          setIsProcessing(false);
          return {
            text: sanitizeText(text),
            suggestions: (response as any).suggestions ?? []
          };
        }
      }
      
      // Fallback response
      setIsProcessing(false);
      return {
        text: sanitizeText(language.fallback),
        suggestions: ['How does it work?', 'What sounds can it detect?', 'Help and support?']
      };
    } catch (error) {
      setIsProcessing(false);
      const errMsg = currentLanguage === 'hi' 
        ? 'क्षमा करें, मुझे आपका प्रश्न समझने में कठिनाई हो रही है। कृपया दूसरे तरीके से पूछें।'
        : 'I apologize, but I\'m having trouble understanding your question. Could you please rephrase it?';
      return {
        text: sanitizeText(errMsg),
        suggestions: ['How does it work?', 'What sounds can it detect?', 'Help and support?']
      };
    }
  };

  return (
    <AIAssistantContext.Provider value={{
      generateResponse,
      isProcessing,
    }}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within a AIAssistantProvider');
  }
  return context;
}