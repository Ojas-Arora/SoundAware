import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundDetection } from '@/contexts/SoundDetectionContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useMLModel } from '@/contexts/MLModelContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AudioVisualizer } from '@/components/ui/AudioVisualizer';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Mic, Square, Upload, Play, Pause } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  FadeInDown,
  FadeInUp 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function RecordScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { addDetection, isRecording, setIsRecording } = useSoundDetection();
  const { addNotification } = useNotifications();
  const { modelSettings, processAudio } = useMLModel();
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  
  const pulseAnim = useSharedValue(1);
  const waveAnim = useSharedValue(0);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
    };
  });

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      opacity: waveAnim.value,
      transform: [{ scale: 1 + waveAnim.value * 0.3 }],
    };
  });

  React.useEffect(() => {
    if (isRecording) {
      pulseAnim.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
      waveAnim.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
    } else {
      pulseAnim.value = withTiming(1);
      waveAnim.value = withTiming(0);
    }
  }, [isRecording]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        const permission = await requestPermission();
        if (permission.status !== 'granted') {
          Alert.alert('Permission required', 'Audio recording permission is needed');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      addNotification({
        title: 'Recording Started',
        message: 'Listening for household sounds...',
        type: 'info',
      });
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        await processAudioFile(uri);
      }

      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsProcessing(false);
    }
  }

  const processAudioFile = async (uri: string) => {
    try {
      const result = await processAudio(uri, modelSettings.sensitivity);
      
      addDetection({
        soundType: result.soundType,
        confidence: result.confidence,
        duration: result.duration,
        audioUri: uri,
      });

      setLastPrediction(`${result.soundType} (${Math.round(result.confidence * 100)}%)`);
      setIsProcessing(false);

      addNotification({
        title: 'Sound Detected',
        message: `Identified: ${result.soundType}`,
        type: result.confidence > 0.8 ? 'success' : 'warning',
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      setIsProcessing(false);
      addNotification({
        title: 'Processing Error',
        message: 'Failed to analyze audio file',
        type: 'error',
      });
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Check file size (50MB limit)
        if (file.size && file.size > 50 * 1024 * 1024) {
          addNotification({
            title: 'File Too Large',
            message: 'Please select a file smaller than 50MB',
            type: 'error',
          });
          return;
        }

        // Check file format
        const supportedFormats = ['.mp3', '.wav', '.m4a', '.aac', '.flac'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!supportedFormats.includes(fileExtension)) {
          addNotification({
            title: 'Unsupported Format',
            message: 'Please select MP3, WAV, M4A, AAC, or FLAC files',
            type: 'error',
          });
          return;
        }

        setUploadedFile(file.name);
        setIsProcessing(true);

        addNotification({
          title: 'File Uploaded',
          message: `Processing ${file.name}...`,
          type: 'info',
        });

        await processAudioFile(file.uri);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      addNotification({
        title: 'Upload Error',
        message: 'Failed to upload audio file',
        type: 'error',
      });
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('recordTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('recordSubtitle')}
          </Text>
        </Animated.View>

        {/* Recording Interface */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.recordingContainer}>
          <Card style={styles.recordingCard}>
            {/* Audio Visualizer */}
            <View style={styles.visualizerContainer}>
              <AudioVisualizer isActive={isRecording} type="circle" height={120} />
            </View>
            
            {/* Wave Animation */}
            {isRecording && (
              <Animated.View style={[styles.waveCircle, animatedWaveStyle, { borderColor: colors.primary }]} />
            )}
            
            {/* Main Recording Button */}
            <Animated.View style={animatedPulseStyle}>
              <Button
                title=""
                onPress={isRecording ? stopRecording : startRecording}
                style={[
                  styles.recordButton,
                  { backgroundColor: isRecording ? colors.error : colors.primary }
                ]}
                icon={isRecording ? <Square size={32} color={colors.background} /> : <Mic size={32} color={colors.background} />}
              />
            </Animated.View>

            <Text style={[styles.recordingStatus, { color: colors.textSecondary }]}>
              {isProcessing ? t('processing') : isRecording ? t('recording') : t('tapToStart')}
            </Text>
            
            {/* Waveform Visualizer */}
            <View style={styles.waveformContainer}>
              <AudioVisualizer isActive={isRecording} type="bars" height={60} barCount={15} />
            </View>
          </Card>
        </Animated.View>

        {/* Last Prediction */}
        {lastPrediction && (
          <Animated.View entering={FadeInDown.delay(300)}>
            <Card style={styles.predictionCard}>
              <Text style={[styles.predictionTitle, { color: colors.text }]}>{t('lastDetection')}</Text>
              <Text style={[styles.predictionText, { color: colors.primary }]}>
                {lastPrediction}
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* Upload Option */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={styles.uploadCard}>
            <Text style={[styles.uploadTitle, { color: colors.text }]}>{t('uploadAudioFile')}</Text>
            <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
              {t('analyzePreRecorded')}
            </Text>
            <Button
              title={t('chooseFile')}
              onPress={() => {
                pickAudioFile();
              }}
              variant="outline"
              icon={<Upload size={20} color={colors.primary} />}
              style={styles.uploadButton}
            />
            {uploadedFile && (
              <Text style={[styles.uploadedFileName, { color: colors.textSecondary }]}>
                Last uploaded: {uploadedFile}
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* Audio Controls */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <Card style={styles.controlsCard}>
            <Text style={[styles.controlsTitle, { color: colors.text }]}>{t('audioControls')}</Text>
            <View style={styles.controlsRow}>
              <Button
                title={t('playLast')}
                onPress={() => {
                  addNotification({
                    title: 'Playback',
                    message: 'Playing last recorded audio',
                    type: 'info',
                  });
                }}
                variant="ghost"
                icon={<Play size={18} color={colors.primary} />}
                size="small"
              />
              <Button
                title={t('pause')}
                onPress={() => {}}
                variant="ghost"
                icon={<Pause size={18} color={colors.primary} />}
                size="small"
              />
            </View>
          </Card>
        </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
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
  recordingContainer: {
    marginBottom: 24,
  },
  recordingCard: {
    alignItems: 'center',
    paddingVertical: 40,
    position: 'relative',
  },
  visualizerContainer: {
    marginBottom: 20,
  },
  waveformContainer: {
    marginTop: 20,
    width: '100%',
  },
  waveCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  recordingStatus: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  predictionCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  predictionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  predictionText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  uploadCard: {
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  uploadButton: {
    alignSelf: 'flex-start',
  },
  uploadedFileName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    fontStyle: 'italic',
  },
  controlsCard: {
    marginBottom: 20,
  },
  controlsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});