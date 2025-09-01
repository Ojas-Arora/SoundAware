import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundDetection } from '@/contexts/SoundDetectionContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useMLModel } from '@/contexts/MLModelContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AudioVisualizer } from '@/components/ui/AudioVisualizer';
import { Activity, Mic, Bell, TrendingUp, Volume2, Shield, Brain, Zap, Database, Clock, BarChart3 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { detections, isRecording } = useSoundDetection();
  const { addNotification, unreadCount } = useNotifications();
  const { modelPerformance, isModelLoaded } = useMLModel();
  const [stats, setStats] = useState({
    todayDetections: 0,
    mostCommon: 'None',
    accuracy: 0,
    weeklyDetections: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [detections]);

  const calculateStats = () => {
    const today = new Date().toDateString();
    const todayDetections = detections.filter(d => d.timestamp.toDateString() === today).length;
    
    // Weekly detections
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyDetections = detections.filter(d => d.timestamp >= weekAgo).length;
    
    const soundCounts: { [key: string]: number } = {};
    detections.forEach(d => {
      soundCounts[d.soundType] = (soundCounts[d.soundType] || 0) + 1;
    });
    
    const mostCommon = Object.keys(soundCounts).length > 0 
      ? Object.keys(soundCounts).reduce((a, b) => soundCounts[a] > soundCounts[b] ? a : b)
      : 'None';
    
    const avgAccuracy = detections.length > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
      : 0;

    setStats({
      todayDetections,
      mostCommon,
      accuracy: Math.round(avgAccuracy * 100),
      weeklyDetections,
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    calculateStats();
    setTimeout(() => {
      setRefreshing(false);
      addNotification({
        title: 'Data Refreshed',
        message: 'Statistics and data have been updated',
        type: 'info',
      });
    }, 1000);
  }, []);

  const quickStartRecording = () => {
    router.push('/record');
    addNotification({
      title: 'Recording Started',
      message: 'Sound detection is now active',
      type: 'info',
    });
  };

  const recentDetections = detections.slice(0, 5);

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('appName')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('homeSubtitle')}
          </Text>
        </Animated.View>

        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Card style={[styles.statusCard, { backgroundColor: isRecording ? colors.success : colors.card }]}>
            <View style={styles.statusContent}>
              <Activity size={24} color={isRecording ? colors.background : colors.primary} />
              <View style={styles.statusTextContainer}>
                <Text style={[styles.statusText, { 
                  color: isRecording ? colors.background : colors.text 
                }]}>
                  {isRecording ? t('activelyMonitoring') : t('monitoringPaused')}
                </Text>
                <Text style={[styles.statusSubtext, { 
                  color: isRecording ? colors.background : colors.textSecondary 
                }]}>
                  {isRecording ? 'Listening for sounds...' : 'Tap record to start'}
                </Text>
              </View>
            </View>
            
            {/* Audio Visualizer */}
            <View style={styles.visualizerContainer}>
              <AudioVisualizer isActive={isRecording} type="waveform" height={40} />
            </View>
          </Card>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInRight.delay(300)} style={styles.statsRow}>
          <Card style={styles.statCard}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.todayDetections}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('today')}</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Volume2 size={20} color={colors.secondary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.accuracy}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('accuracy')}</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <BarChart3 size={20} color={colors.accent} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.weeklyDetections}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Week</Text>
          </Card>
        </Animated.View>

        {/* ML Model Status */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <Card style={styles.modelStatusCard}>
            <View style={styles.modelHeader}>
              <Brain size={24} color={colors.primary} />
              <Text style={[styles.modelTitle, { color: colors.text }]}>AI Model Status</Text>
              <View style={[
                styles.modelStatusBadge, 
                { backgroundColor: isModelLoaded ? colors.success : colors.warning }
              ]}>
                <Text style={[styles.modelStatusText, { color: colors.background }]}>
                  {isModelLoaded ? 'Ready' : 'Loading'}
                </Text>
              </View>
            </View>
            
            <View style={styles.modelMetrics}>
              <View style={styles.metricItem}>
                <Zap size={16} color={colors.accent} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Inference</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {modelPerformance.inferenceTime}ms
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Database size={16} color={colors.secondary} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Precision</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {Math.round(modelPerformance.precision * 100)}%
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Activity size={16} color={colors.primary} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>F1 Score</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {Math.round(modelPerformance.f1Score * 100)}%
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={styles.actionsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickActions')}</Text>
            <View style={styles.actionButtons}>
              <Button
                title={t('startRecording')}
                onPress={quickStartRecording}
                icon={<Mic size={20} color={colors.background} />}
                style={styles.actionButton}
              />
              <Button
                title={`${t('viewAlerts')} ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
                onPress={() => router.push('/notifications')}
                variant="outline"
                icon={<Bell size={20} color={colors.primary} />}
                style={styles.actionButton}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Recent Detections */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <Card style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentDetections')}</Text>
              <TouchableOpacity onPress={() => router.push('/history')}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {recentDetections.length > 0 ? (
              recentDetections.map((detection, index) => (
                <Animated.View 
                  key={detection.id}
                  entering={FadeInRight.delay(600 + index * 100)}
                  style={[styles.detectionItem, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.detectionInfo}>
                    <Text style={[styles.detectionSound, { color: colors.text }]}>
                      {detection.soundType}
                    </Text>
                    <View style={styles.detectionMeta}>
                      <Clock size={12} color={colors.textSecondary} />
                      <Text style={[styles.detectionTime, { color: colors.textSecondary }]}>
                        {getTimeAgo(detection.timestamp)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.confidenceContainer}>
                    <View style={[styles.confidenceBar, { backgroundColor: colors.border }]}>
                      <View style={[
                        styles.confidenceFill,
                        { 
                          backgroundColor: colors.primary,
                          width: `${detection.confidence * 100}%`
                        }
                      ]} />
                    </View>
                    <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
                      {Math.round(detection.confidence * 100)}%
                    </Text>
                  </View>
                </Animated.View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('noDetectionsYet')}
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* ML Model Info */}
        <Animated.View entering={FadeInDown.delay(600)}>
          <Card style={styles.modelCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Detection Capabilities</Text>
            <View style={styles.modelInfo}>
              <View style={styles.capabilityRow}>
                <Shield size={16} color={colors.success} />
                <Text style={[styles.modelText, { color: colors.textSecondary }]}>
                  Kitchen: Timer, Microwave, Boiling Water, Blender
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Bell size={16} color={colors.warning} />
                <Text style={[styles.modelText, { color: colors.textSecondary }]}>
                  Security: Doorbell, Alarms, Breaking Glass
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Volume2 size={16} color={colors.primary} />
                <Text style={[styles.modelText, { color: colors.textSecondary }]}>
                  Appliances: Washing Machine, Vacuum, AC
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Activity size={16} color={colors.secondary} />
                <Text style={[styles.modelText, { color: colors.textSecondary }]}>
                  Pets: Dog Bark, Cat Meow, Bird Chirping
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <TrendingUp size={16} color={colors.error} />
                <Text style={[styles.modelText, { color: colors.textSecondary }]}>
                  Emergency: Smoke Alarm, CO Detector
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  statusCard: {
    marginBottom: 20,
    paddingVertical: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  visualizerContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  recentCard: {
    marginBottom: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  detectionInfo: {
    flex: 1,
  },
  detectionSound: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  detectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detectionTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  confidenceBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    width: 35,
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  modelCard: {
    marginBottom: 20,
  },
  modelStatusCard: {
    marginBottom: 20,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modelTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  modelStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modelStatusText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  modelMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  modelInfo: {
    gap: 12,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
});