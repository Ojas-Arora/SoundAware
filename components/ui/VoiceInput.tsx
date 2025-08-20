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
  const { t } = useLanguage();
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
      
      // Simulate voice recognition
      setTimeout(() => {
        const sampleQueries = [
          'How does sound detection work?',
          'What sounds can you detect?',
          'How accurate is the model?',
          'Can I upload audio files?',
          'How to improve accuracy?'
        ];
        
        const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
        onResult(randomQuery);
        setIsListening(false);
      }, 2000);
    } else {
      // Mobile speech recognition would go here
      setIsListening(true);
      setTimeout(() => {
        onResult('Voice input simulated on mobile');
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