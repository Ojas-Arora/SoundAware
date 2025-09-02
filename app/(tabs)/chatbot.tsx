import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { ChatMessage } from '@/types';
import { Send, Bot, User, Sparkles, Lightbulb } from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight, SlideInLeft } from 'react-native-reanimated';

export default function ChatbotScreen() {
  const { colors } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const { generateResponse, isProcessing } = useAIAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: currentLanguage === 'hi' 
        ? 'नमस्ते! मैं ध्वनि वर्गीकरण के लिए आपका AI सहायक हूं। ऐप, ध्वनि पहचान, या सुविधाओं के उपयोग के बारे में मुझसे कुछ भी पूछें!'
        : currentLanguage === 'pa'
        ? 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਆਵਾਜ਼ ਵਰਗੀਕਰਨ ਲਈ ਤੁਹਾਡਾ AI ਸਹਾਇਕ ਹਾਂ। ਐਪ, ਆਵਾਜ਼ ਪਛਾਣ, ਜਾਂ ਸੁਵਿਧਾਵਾਂ ਬਾਰੇ ਮੈਨੂੰ ਕੁਝ ਵੀ ਪੁੱਛੋ!'
        : 'Hello! I\'m your advanced AI assistant for sound classification. Ask me anything about the app, sound detection, or how to use the features!',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const predefinedResponses: { [key: string]: { [key: string]: string } } = {
    en: {
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
      'real time': 'Yes! The app processes audio in real-time with minimal latency. Detection results appear within 1-2 seconds of sound occurrence.',
      'confidence score': 'Confidence scores indicate how certain the model is about its prediction. Scores above 80% are highly reliable, 60-80% are good, below 60% may need verification.',
      'export data': 'Detection history can be exported as CSV or shared as summary from the History tab. This includes timestamps, sound types, and confidence scores.',
      'languages': 'The app supports multiple languages including English, Hindi, Punjabi, Gujarati, Tamil, Telugu, Bengali, and Marathi with full UI translation.',
    },
    hi: {
      'कैसे काम करता है': 'यह ऐप TensorFlow Lite मॉडल का उपयोग करके ऑडियो पैटर्न का विश्लेषण करता है और घरेलू ध्वनियों को वर्गीकृत करता है। यह रियल-टाइम में ऑडियो प्रोसेस करता है।',
      'कौन सी आवाजें': 'वर्तमान में, ऐप 25+ घरेलू ध्वनियों का पता लगा सकता है जिसमें डोरबेल, किचन टाइमर, बहता पानी, माइक्रोवेव बीप, फोन रिंग, कुत्ते का भौंकना शामिल है।',
      'सटीकता': 'ML मॉडल आमतौर पर ऑडियो गुणवत्ता और वातावरण के आधार पर 85-95% सटीकता प्राप्त करता है।',
      'गोपनीयता': 'सभी ऑडियो प्रसंस्करण आपके डिवाइस पर स्थानीय रूप से होता है। कोई ऑडियो डेटा बाहरी सर्वर पर नहीं भेजा जाता।',
      'मदद': 'मुख्य सुविधाएं: 1) लाइव ऑडियो वर्गीकरण के लिए रिकॉर्ड टैब 2) पिछली पहचान देखने के लिए इतिहास टैब 3) अलर्ट के लिए सूचनाएं 4) अनुकूलन के लिए सेटिंग्स',
    },
    pa: {
      'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ': 'ਇਹ ਐਪ TensorFlow Lite ਮਾਡਲਾਂ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਆਡੀਓ ਪੈਟਰਨ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰਦਾ ਹੈ ਅਤੇ ਘਰੇਲੂ ਆਵਾਜ਼ਾਂ ਨੂੰ ਵਰਗੀਕਰਨ ਕਰਦਾ ਹੈ।',
      'ਕਿਹੜੀਆਂ ਆਵਾਜ਼ਾਂ': 'ਵਰਤਮਾਨ ਵਿੱਚ, ਐਪ 25+ ਘਰੇਲੂ ਆਵਾਜ਼ਾਂ ਦਾ ਪਤਾ ਲਗਾ ਸਕਦਾ ਹੈ ਜਿਸ ਵਿੱਚ ਦਰਵਾਜ਼ੇ ਦੀ ਘੰਟੀ, ਰਸੋਈ ਟਾਈਮਰ, ਵਗਦਾ ਪਾਣੀ ਸ਼ਾਮਲ ਹੈ।',
      'ਮਦਦ': 'ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ: 1) ਲਾਈਵ ਆਡੀਓ ਵਰਗੀਕਰਨ ਲਈ ਰਿਕਾਰਡ ਟੈਬ 2) ਪਿਛਲੀ ਪਛਾਣ ਦੇਖਣ ਲਈ ਇਤਿਹਾਸ ਟੈਬ',
    },
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
    const userQuery = inputText.trim();
    setInputText('');

    
    // Generate AI response
    generateResponse(userQuery).then((aiResponse) => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Add suggestion buttons if available
      if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
        setTimeout(() => {
          const suggestionMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: `💡 ${currentLanguage === 'hi' ? 'सुझाव' : 'Suggestions'}: ${aiResponse.suggestions?.join(' • ')}`,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, suggestionMessage]);
        }, 500);
      }
    }).catch((error) => {
      console.error('AI Response Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: currentLanguage === 'hi' 
          ? 'क्षमा करें, मुझे कुछ तकनीकी समस्या हो रही है। कृपया दोबारा कोशिश करें।'
          : 'Sorry, I\'m experiencing some technical difficulties. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    });
  };

  const quickQuestions = currentLanguage === 'hi' ? [
    'कैसे काम करता है?',
    'कौन सी आवाजें?',
    'सटीकता कैसी है?',
    'गोपनीयता और सुरक्षा?',
    'फ़ाइल अपलोड सपोर्ट?',
    'रियल-टाइम डिटेक्शन?',
    'मदद चाहिए?',
  ] : currentLanguage === 'pa' ? [
    'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ?',
    'ਕਿਹੜੀਆਂ ਆਵਾਜ਼ਾਂ?',
    'ਸ਼ੁੱਧਤਾ ਕਿੰਨੀ ਹੈ?',
    'ਗੁਪਤਤਾ ਅਤੇ ਸੁਰੱਖਿਆ?',
    'ਮਦਦ ਚਾਹੀਦੀ ਹੈ?',
  ] : [
    'How does it work?',
    'What sounds can it detect?',
    'How accurate is it?',
    'Privacy and security?',
    'File upload support?',
    'Real-time detection?',
    'Help and support?',
  ];

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Sparkles size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{t('aiAssistant')}</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('askAboutSound')}
        </Text>
      </Animated.View>

      {/* Quick Questions */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.quickQuestions}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickQuestionsContent}
          style={styles.quickQuestionsScroll}
        >
          {quickQuestions.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickQuestion, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setInputText(question);
                setTimeout(() => sendMessage(), 100);
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
                maxWidth: '85%',
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
        
        {isProcessing && (
          <Animated.View entering={SlideInLeft} style={styles.aiMessageWrapper}>
            <Card style={[styles.messageCard, { backgroundColor: colors.card }]}>
              <View style={styles.typingIndicator}>
                <Bot size={16} color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                  {t('aiTyping')}
                </Text>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                </View>
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
            style={[
              styles.sendButton, 
              { 
                backgroundColor: inputText.trim() ? colors.primary : colors.border,
              }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isProcessing}
          >
            <Send size={20} color={inputText.trim() ? colors.background : colors.textSecondary} />
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
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
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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