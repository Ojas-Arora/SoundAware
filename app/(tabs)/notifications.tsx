import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSoundDetection } from '@/contexts/SoundDetectionContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Bell, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, 
  Info, Circle as XCircle, Trash2, Filter, Volume2, Shield, Clock 
} from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const { notifications, markAsRead, clearAll, unreadCount } = useNotifications();
  const { detections } = useSoundDetection();
  const [filter, setFilter] = useState<string>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color={colors.success} />;
      case 'warning': return <AlertTriangle size={20} color={colors.warning} />;
      case 'error': return <XCircle size={20} color={colors.error} />;
      default: return <Info size={20} color={colors.primary} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      default: return colors.primary;
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) {
      Alert.alert(
        currentLanguage === 'hi' ? 'कोई सूचना नहीं' : 'No Notifications',
        currentLanguage === 'hi' 
          ? 'साफ़ करने के लिए कोई सूचना नहीं है' 
          : 'There are no notifications to clear',
        [{ text: t('ok') }]
      );
      return;
    }

    Alert.alert(
      t('clearAll'),
      currentLanguage === 'hi' 
        ? 'क्या आप वाकई सभी सूचनाओं को साफ़ करना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।'
        : 'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('confirm'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAll();
              Alert.alert(
                currentLanguage === 'hi' ? 'सफल' : 'Success',
                currentLanguage === 'hi' 
                  ? 'सभी सूचनाएं सफलतापूर्वक हटा दी गई हैं' 
                  : 'All notifications have been cleared',
                [{ text: t('ok') }]
              );
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert(
                t('error'),
                currentLanguage === 'hi' 
                  ? 'सूचनाएं साफ़ करने में त्रुटि हुई' 
                  : 'Error clearing notifications',
                [{ text: t('ok') }]
              );
            }
          }
        }
      ]
    );
  };

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
    });
  };

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
      <View style={styles.header}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={[styles.title, { color: colors.text }]}>{t('notificationsTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {unreadCount} {t('unreadNotifications')}
          </Text>
        </Animated.View>
      </View>

      {/* Actions */}
      {notifications.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.actionsContainer}>
          <View style={styles.filterRow}>
            {['all', 'success', 'warning', 'error', 'info'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: filter === type ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => setFilter(type)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filter === type ? colors.background : colors.text }
                ]}>
                  {type === 'all' ? t('all') : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.actionButtonsRow}>
            {unreadCount > 0 && (
              <Button
                title="Mark All Read"
                onPress={markAllAsRead}
                variant="ghost"
                icon={<CheckCircle size={18} color={colors.success} />}
                size="small"
              />
            )}
            
            <Button
              title={t('clearAll')}
              onPress={handleClearAll}
              variant="outline"
              icon={<Trash2 size={18} color={colors.error} />}
              size="small"
            />
          </View>
        </Animated.View>
      )}

      {/* Quick Stats */}
      {notifications.length > 0 && (
        <Animated.View entering={FadeInDown.delay(250)} style={styles.quickStats}>
          <Card style={styles.quickStatsCard}>
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Bell size={16} color={colors.primary} />
                <Text style={[styles.quickStatText, { color: colors.text }]}>
                  {notifications.length} Total
                </Text>
              </View>
              <View style={styles.quickStatItem}>
                <Volume2 size={16} color={colors.success} />
                <Text style={[styles.quickStatText, { color: colors.text }]}>
                  {detections.length} Detections
                </Text>
              </View>
              <View style={styles.quickStatItem}>
                <Shield size={16} color={colors.warning} />
                <Text style={[styles.quickStatText, { color: colors.text }]}>
                  {notifications.filter(n => n.type === 'warning' || n.type === 'error').length} Alerts
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Notifications List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification, index) => (
            <Animated.View
              key={notification.id}
              entering={SlideInRight.delay(300 + index * 100)}
            >
              <TouchableOpacity
                onPress={() => markAsRead(notification.id)}
                style={styles.notificationWrapper}
              >
                <Card style={{
                  ...styles.notificationCard,
                  ...(!notification.read ? { 
                    borderLeftWidth: 4, 
                    borderLeftColor: getNotificationColor(notification.type),
                    backgroundColor: colors.surface,
                  } : {})
                }}>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      {getNotificationIcon(notification.type)}
                      <View style={styles.notificationInfo}>
                        <Text style={[
                          styles.notificationTitle,
                          { color: colors.text },
                          !notification.read && styles.unreadTitle
                        ]}>
                          {notification.title}
                        </Text>
                        <View style={styles.timeContainer}>
                          <Clock size={12} color={colors.textSecondary} />
                          <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                            {getTimeAgo(notification.timestamp)}
                          </Text>
                        </View>
                      </View>
                      {!notification.read && (
                        <View style={[styles.unreadDot, { backgroundColor: getNotificationColor(notification.type) }]} />
                      )}
                    </View>
                    
                    <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
                      {notification.message}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyContainer}>
            <Card style={styles.emptyCard}>
              <Bell size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noNotifications')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('seeAlertsHere')}
              </Text>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
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
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  quickStats: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickStatsCard: {
    padding: 16,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationWrapper: {
    marginBottom: 12,
  },
  notificationCard: {
    padding: 16,
  },
  notificationContent: {
    gap: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  unreadTitle: {
    fontFamily: 'Inter-Bold',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    paddingLeft: 32,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});