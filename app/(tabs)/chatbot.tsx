import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { ChatMessage } from '@/types';
import { Send, Bot, User } from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight, SlideInLeft } from 'react-native-reanimated';

export default function ChatbotScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant for sound classification. Ask me anything about the app, sound detection, or how to use the features!',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const predefinedResponses: { [key: string]: string } = {
    'how does it work': 'The app uses TensorFlow Lite models to analyze audio patterns and classify household sounds. It processes audio in real-time and provides confidence scores for each detection.',
    'what sounds': 'Currently, the app can detect 25+ household sounds including doorbell, kitchen timer, running water, microwave beep, phone ring, dog bark, washing machine, vacuum cleaner, smoke alarm, baby crying, glass breaking, and more.',
    'accuracy': 'The ML model typically achieves 85-95% accuracy depending on audio quality and environment. Background noise may affect accuracy.',
    'privacy': 'All audio processing happens locally on your device. No audio data is sent to external servers, ensuring complete privacy.',
    'battery': 'The app is optimized for battery efficiency. Continuous monitoring uses minimal resources thanks to efficient ML model optimization.',
    'dark mode': 'You can toggle dark/light mode in the Settings tab. The app also respects your system theme preferences.',
    'notifications': 'Notifications alert you when important sounds are detected. You can customize notification settings in the Settings tab.',
    'help': 'Main features: 1) Record tab for live audio classification 2) History tab to view past detections 3) Notifications for alerts 4) Settings for customization',
    'file upload': 'You can upload .mp3, .wav, .m4a, and .aac audio files for analysis. Go to the Record tab and tap "Choose File" to select an audio file from your device.',
    'supported formats': 'The app supports MP3, WAV, M4A, AAC, and FLAC audio formats. Files should be under 50MB for optimal performance.',
    'model training': 'The ML model is trained on thousands of household sound samples using TensorFlow. It uses spectral analysis and deep neural networks for classification.',
    'real time': 'Yes! The app processes audio in real-time with minimal latency. Detection results appear within 1-2 seconds of sound occurrence.',
    'confidence score': 'Confidence scores indicate how certain the model is about its prediction. Scores above 80% are highly reliable, 60-80% are good, below 60% may need verification.',
    'background noise': 'The model is trained to handle moderate background noise. For best results, ensure the target sound is clearly audible above ambient noise.',
    'multiple sounds': 'The app can detect overlapping sounds but performs best with single, distinct sounds. Multiple simultaneous sounds may reduce accuracy.',
    'calibration': 'You can adjust detection sensitivity in Settings. Higher sensitivity detects quieter sounds but may increase false positives.',
    'export data': 'Detection history can be exported as CSV or JSON format from the History tab. This includes timestamps, sound types, and confidence scores.',
    'smart home': 'The app is designed for future integration with smart home systems like Alexa, Google Home, and IoT devices for automated responses.',
    'offline': 'Yes! All processing happens locally on your device. No internet connection is required for sound classification once the app is installed.',
    'update model': 'Model updates are delivered through app updates. New versions may include additional sound classes and improved accuracy.',
    'false positive': 'If you notice incorrect detections, you can provide feedback in the History tab to help improve the model over time.',
    'hearing aid': 'The app works alongside hearing aids and cochlear implants. Visual notifications complement audio alerts for accessibility.',
    'elderly': 'The app features large text, simple navigation, and clear visual indicators designed specifically for elderly users and accessibility needs.',
    'emergency': 'The app can detect emergency sounds like smoke alarms, carbon monoxide detectors, and security alarms with high priority notifications.',
    'pets': 'Pet sounds like dog barking, cat meowing, and bird chirping are included in the classification model with dedicated categories.',
    'kitchen': 'Kitchen sounds include microwave beeps, timer alarms, boiling water, blender, coffee maker, and dishwasher cycles.',
    'security': 'Security-related sounds include doorbell, door knocking, window breaking, car alarms, and motion sensor alerts.',
    'appliances': 'Home appliance sounds cover washing machine, dryer, vacuum cleaner, air conditioner, heater, and garbage disposal.',
    'baby sounds': 'The app can detect baby crying, infant distress calls, and nursery sounds to help parents monitor their children.',
    'medical alerts': 'Medical device sounds like CPAP machines, oxygen concentrators, and medical alarms are supported for health monitoring.',
    'outdoor sounds': 'Outdoor sounds include car engines, lawn mowers, construction noise, and weather-related sounds like thunder.',
    'music detection': 'The app can identify music genres, instruments, and audio entertainment sources for comprehensive sound awareness.',
    'voice commands': 'Voice command recognition allows hands-free interaction with the app using natural language processing.',
    'sound zones': 'Create custom sound zones for different areas of your home with specific detection profiles and sensitivity settings.',
    'machine learning': 'The app uses convolutional neural networks (CNNs) trained on spectrograms for accurate sound classification.',
    'data privacy': 'All audio processing happens locally on your device. No audio data is transmitted to external servers, ensuring complete privacy.',
    'battery optimization': 'Advanced power management ensures minimal battery drain during continuous monitoring with smart sleep modes.',
    'cloud sync': 'Optional cloud synchronization allows you to backup detection history and sync settings across multiple devices.',
    'api integration': 'REST API endpoints allow integration with home automation systems, smart speakers, and IoT devices.',
    'custom sounds': 'Train the model to recognize custom sounds specific to your environment using the built-in learning mode.',
    'sound alerts': 'Configure custom alert patterns for different sound types with varying urgency levels and notification styles.',
    'accessibility features': 'Full accessibility support including screen readers, high contrast mode, and vibration patterns for hearing-impaired users.',
    'multi-room': 'Multi-room detection allows monitoring different areas of your home simultaneously with zone-specific settings.',
    'sound masking': 'Background noise filtering and sound masking help improve detection accuracy in noisy environments.',
    'temporal patterns': 'The app learns temporal patterns of household sounds to improve prediction accuracy over time.',
    'frequency analysis': 'Advanced frequency domain analysis provides detailed spectral information for each detected sound.',
    'sound fingerprinting': 'Unique audio fingerprinting technology identifies specific appliances and devices in your home.',
    'environmental adaptation': 'The model automatically adapts to your specific acoustic environment for improved performance.',
    'sound mapping': 'Create acoustic maps of your home to visualize sound sources and optimize sensor placement.',
    'predictive alerts': 'Predictive algorithms anticipate routine sounds and provide proactive notifications.',
    'sound health': 'Monitor acoustic health of appliances by detecting changes in their sound signatures over time.',
    'voice training': 'Train the system to recognize specific voices and speech patterns for personalized responses.',
    'sound scheduling': 'Schedule automatic recording sessions and set time-based detection profiles for different parts of the day.',
    'audio quality': 'Automatic audio quality assessment ensures optimal recording conditions for accurate classification.',
    'sound library': 'Extensive sound library with over 1000 pre-trained sound categories covering residential, commercial, and outdoor environments.',
    'real-time streaming': 'Real-time audio streaming capabilities allow continuous monitoring with instant classification results.',
    'sound events': 'Create custom sound events and triggers that can activate smart home devices or send notifications.',
    'audio compression': 'Advanced audio compression algorithms reduce storage requirements while maintaining classification accuracy.',
    'sound visualization': 'Real-time sound visualization with waveforms, spectrograms, and frequency analysis for detailed audio insights.',
    'multi-language': 'The app supports multiple languages including English, Hindi, and regional languages with automatic UI translation.',
    'voice instructions': 'Voice-to-text instructions allow hands-free operation and accessibility for users with mobility limitations.',
    'soundaware features': 'SoundAware offers comprehensive household sound monitoring with AI-powered classification, real-time alerts, and smart home integration.',
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const userMessage = inputText.toLowerCase();
      let response = 'I understand you\'re asking about sound classification. Could you be more specific about what you\'d like to know?';

      // Find matching response
      for (const [key, value] of Object.entries(predefinedResponses)) {
        if (userMessage.includes(key)) {
          response = value;
          break;
        }
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const quickQuestions = [
    'How does it work?',
    'What sounds can it detect?',
    'How accurate is it?',
    'Privacy and security?',
    'File upload support?',
    'Real-time detection?',
    'Confidence scores?',
    'Smart home integration?',
    'Baby sounds detection?',
    'Medical alerts support?',
    'Multi-language support?',
    'Voice instructions?',
    'Sound zones setup?',
    'Custom sounds training?',
    'Emergency sound alerts?',
    'SoundAware features?',
    'Battery optimization?',
    'Accessibility features?',
    'Sound visualization?',
    'Multi-room detection?',
  ];

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('aiAssistant')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('askAboutSound')}
        </Text>
      </Animated.View>

      {/* Quick Questions */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.quickQuestions}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.quickQuestionsContent}
          style={styles.quickQuestionsScroll}
        >
          {quickQuestions.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickQuestion, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setInputText(question);
                sendMessage();
              }}
            >
              <Text style={[styles.quickQuestionText, { color: colors.primary }]}>
                {question}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => (
          <Animated.View
            key={message.id}
            entering={message.isUser ? SlideInRight.delay(100) : SlideInLeft.delay(100)}
            style={[
              styles.messageWrapper,
              message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper
            ]}
          >
            <Card style={[
              styles.messageCard,
              {
                backgroundColor: message.isUser ? colors.primary : colors.card,
                maxWidth: '80%',
              }
            ]}>
              <View style={styles.messageHeader}>
                {message.isUser ? (
                  <User size={16} color={colors.background} />
                ) : (
                  <Bot size={16} color={colors.primary} />
                )}
                <Text style={[
                  styles.messageText,
                  { color: message.isUser ? colors.background : colors.text }
                ]}>
                  {message.text}
                </Text>
              </View>
              <Text style={[
                styles.messageTime,
                { color: message.isUser ? colors.background : colors.textSecondary }
              ]}>
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </Card>
          </Animated.View>
        ))}
        
        {isTyping && (
          <Animated.View entering={SlideInLeft} style={styles.aiMessageWrapper}>
            <Card style={[styles.messageCard, { backgroundColor: colors.card }]}>
              <View style={styles.typingIndicator}>
                <Bot size={16} color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                  {t('aiTyping')}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}
      </ScrollView>

      {/* Input */}
      <Animated.View entering={FadeInDown.delay(300)} style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder={t('askAnything')}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            multiline
            maxLength={500}
          />
          <VoiceInput 
            onResult={(text) => {
              setInputText(text);
              setTimeout(() => sendMessage(), 500);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Send size={20} color={colors.background} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  quickQuestions: {
    paddingVertical: 16,
  },
  quickQuestionsScroll: {
    maxHeight: 50,
  },
  quickQuestionsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickQuestion: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickQuestionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 100,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageCard: {
    padding: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    opacity: 0.7,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    padding: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    minHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});