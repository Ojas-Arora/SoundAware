import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as Speech from 'expo-speech';
import { Mic, MicOff } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming 
} from 'react-native-reanimated';

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
}

export function VoiceInput({ onResult, placeholder = 'Tap to speak...' }: VoiceInputProps) {
  const { colors } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
    };
  });

  React.useEffect(() => {
    if (isListening) {
      pulseAnim.value = withRepeat(withTiming(1.1, { duration: 800 }), -1, true);
    } else {
      pulseAnim.value = withTiming(1);
    }
  }, [isListening]);

  const startListening = async () => {
    if (Platform.OS === 'web') {
      // Web Speech API simulation
      setIsListening(true);
      
      // Simulate voice recognition with language-specific queries
      setTimeout(() => {
        const sampleQueries: { [key: string]: string[] } = {
          en: [
            'How does sound detection work?',
            'What sounds can you detect?',
            'How accurate is the model?',
            'Can I upload audio files?',
            'How to improve accuracy?',
            'Tell me about privacy features',
            'What are the supported formats?',
          ],
          hi: [
            'ध्वनि पहचान कैसे काम करती है?',
            'कौन सी आवाजें पहचान सकते हैं?',
            'मॉडल कितना सटीक है?',
            'क्या मैं ऑडियो फाइलें अपलोड कर सकता हूं?',
            'सटीकता कैसे सुधारें?',
          ],
          pa: [
            'ਆਵਾਜ਼ ਪਛਾਣ ਕਿਵੇਂ ਕੰਮ ਕਰਦੀ ਹੈ?',
            'ਕਿਹੜੀਆਂ ਆਵਾਜ਼ਾਂ ਪਛਾਣ ਸਕਦੇ ਹਾਂ?',
            'ਮਾਡਲ ਕਿੰਨਾ ਸਹੀ ਹੈ?',
          ],
          gu: [
            'અવાજ ઓળખ કેવી રીતે કામ કરે છે?',
            'કયા અવાજો ઓળખી શકાય છે?',
            'મોડેલ કેટલું સચોટ છે?',
          ],
        };
        
        const queries = sampleQueries[currentLanguage] || sampleQueries.en;
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        onResult(randomQuery);
        setIsListening(false);
      }, 2000);
    } else {
      // Mobile speech recognition would go here
      setIsListening(true);
      setTimeout(() => {
        const mobileSamples = [
          'Voice input simulated on mobile',
          'How does this app work?',
          'What sounds can be detected?',
        ];
        onResult(mobileSamples[Math.floor(Math.random() * mobileSamples.length)]);
        setIsListening(false);
      }, 2000);
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  return (
    <TouchableOpacity
      style={[
        styles.voiceButton,
        { 
          backgroundColor: isListening ? colors.primary : colors.surface,
          borderColor: colors.border,
        }
      ]}
      onPress={isListening ? stopListening : startListening}
    >
      <Animated.View style={animatedStyle}>
        {isListening ? (
          <MicOff size={20} color={colors.background} />
        ) : (
          <Mic size={20} color={colors.primary} />
        )}
      </Animated.View>
      <Text style={[
        styles.voiceButtonText,
        { color: isListening ? colors.background : colors.primary }
      ]}>
        {isListening ? 'Listening...' : 'Voice'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  voiceButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});