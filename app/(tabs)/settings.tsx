import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMLModel } from '@/contexts/MLModelContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSoundDetection } from '@/contexts/SoundDetectionContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/types';
import { Moon, Sun, Bell, Volume2, Settings as SettingsIcon, Info, Shield, Smartphone, CircleHelp as HelpCircle, Brain, Zap, Database, Download, RotateCcw, FileSliders as Sliders, Activity, Cpu, ChartBar as BarChart3, Globe, CircleCheck as CheckCircle } from 'lucide-react-native';

export default function SettingsScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  const { t, currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const { modelSettings, updateModelSettings, resetModel } = useMLModel();
  const { addNotification } = useNotifications();
  const { setIsRecording } = useSoundDetection();
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: isDark,
    notifications: true,
    sensitivity: 0.7,
    autoRecord: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setSettings(prev => ({ ...prev, darkMode: isDark }));
  }, [isDark]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      
      // Real-time feature implementation
      if (key === 'autoRecord' && value === true) {
        // Auto-start recording when enabled
        setTimeout(() => {
          setIsRecording(true);
          addNotification({
            title: t('autoRecording'),
            message: currentLanguage === 'hi' ? 'स्वचालित रिकॉर्डिंग शुरू हो गई' : 'Auto recording started',
            type: 'success',
          });
        }, 1000);
      }
      
      if (key === 'notifications') {
        addNotification({
          title: currentLanguage === 'hi' ? 'सूचना सेटिंग्स' : 'Notification Settings',
          message: value 
            ? (currentLanguage === 'hi' ? 'पुश सूचनाएं सक्षम की गईं' : 'Push notifications enabled')
            : (currentLanguage === 'hi' ? 'पुश सूचनाएं अक्षम की गईं' : 'Push notifications disabled'),
          type: 'info',
        });
      }
      
      addNotification({
        title: currentLanguage === 'hi' ? 'सेटिंग्स अपडेट हुईं' : 'Settings Updated',
        message: currentLanguage === 'hi' 
          ? `${key} सफलतापूर्वक अपडेट हो गया` 
          : `${key} has been updated successfully`,
        type: 'success',
      });
    } catch (error) {
      console.log('Error saving settings:', error);
      addNotification({
        title: currentLanguage === 'hi' ? 'सेटिंग्स त्रुटि' : 'Settings Error',
        message: currentLanguage === 'hi' ? 'सेटिंग्स सेव करने में विफल' : 'Failed to save settings',
        type: 'error',
      });
    }
  };

  const resetSettings = () => {
    Alert.alert(
      currentLanguage === 'hi' ? 'सेटिंग्स रीसेट करें' : 'Reset Settings',
      currentLanguage === 'hi' 
        ? 'क्या आप वाकई सभी सेटिंग्स को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?'
        : 'Are you sure you want to reset all settings to default?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('reset'), 
          style: 'destructive',
          onPress: async () => {
            const defaultSettings: AppSettings = {
              darkMode: false,
              notifications: true,
              sensitivity: 0.7,
              autoRecord: false,
            };
            setSettings(defaultSettings);
            await AsyncStorage.setItem('app_settings', JSON.stringify(defaultSettings));
            
            // Reset theme to light mode
            if (isDark) {
              toggleTheme();
            }
            
            addNotification({
              title: currentLanguage === 'hi' ? 'सेटिंग्स रीसेट हुईं' : 'Settings Reset',
              message: currentLanguage === 'hi' 
                ? 'सभी सेटिंग्स डिफ़ॉल्ट मानों पर रीसेट हो गईं'
                : 'All settings have been reset to default values',
              type: 'info',
            });
          }
        }
      ]
    );
  };

  const handleLanguageChange = async (languageCode: string) => {
    await setLanguage(languageCode);
    setShowLanguageSelector(false);
    
    addNotification({
      title: languageCode === 'hi' ? 'भाषा बदली गई' : 'Language Changed',
      message: languageCode === 'hi' 
        ? `भाषा ${availableLanguages.find(l => l.code === languageCode)?.nativeName} में अपडेट हो गई`
        : `Language updated to ${availableLanguages.find(l => l.code === languageCode)?.nativeName}`,
      type: 'success',
    });
  };

  const handleMLModelReset = () => {
    Alert.alert(
      currentLanguage === 'hi' ? 'ML मॉडल रीसेट करें' : 'Reset ML Model',
      currentLanguage === 'hi' 
        ? 'क्या आप वाकई सभी ML मॉडल सेटिंग्स को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?'
        : 'Are you sure you want to reset all ML model settings to default?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('reset'), 
          style: 'destructive',
          onPress: () => {
            resetModel();
            addNotification({
              title: currentLanguage === 'hi' ? 'ML मॉडल रीसेट हुआ' : 'ML Model Reset',
              message: currentLanguage === 'hi' 
                ? 'ML मॉडल सेटिंग्स डिफ़ॉल्ट पर रीसेट हो गईं'
                : 'ML model settings have been reset to defaults',
              type: 'info',
            });
          }
        }
      ]
    );
  };

  const handleSensitivityChange = (value: number) => {
    updateModelSettings({ sensitivity: value });
    addNotification({
      title: currentLanguage === 'hi' ? 'संवेदनशीलता अपडेट हुई' : 'Sensitivity Updated',
      message: currentLanguage === 'hi' 
        ? `संवेदनशीलता ${Math.round(value * 100)}% पर सेट की गई`
        : `Sensitivity set to ${Math.round(value * 100)}%`,
      type: 'info',
    });
  };

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    type = 'switch' 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    value: boolean | number;
    onValueChange: (value: any) => void;
    type?: 'switch' | 'slider';
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        {icon}
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value as boolean}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('settingsTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('customizeExperience')}
          </Text>
        </Animated.View>

        {/* Theme Settings */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('appearance')}</Text>
            <SettingRow
              icon={isDark ? <Moon size={24} color={colors.primary} /> : <Sun size={24} color={colors.primary} />}
              title={t('darkMode')}
              subtitle={t('toggleThemes')}
              value={settings.darkMode}
              onValueChange={toggleTheme}
            />
          </Card>
        </Animated.View>

        {/* Language Settings */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Card style={styles.settingsCard}>
            <View style={styles.sectionHeader}>
              <Globe size={24} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('language')}</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.languageSelector, { borderColor: colors.border }]}
              onPress={() => setShowLanguageSelector(!showLanguageSelector)}
            >
              <View style={styles.languageSelectorContent}>
                <Text style={[styles.selectedLanguage, { color: colors.text }]}>
                  {availableLanguages.find(lang => lang.code === currentLanguage)?.nativeName}
                </Text>
                <Text style={[styles.selectedLanguageSubtext, { color: colors.textSecondary }]}>
                  {availableLanguages.find(lang => lang.code === currentLanguage)?.name}
                </Text>
              </View>
              <CheckCircle size={20} color={colors.success} />
            </TouchableOpacity>
            
            {showLanguageSelector && (
              <View style={styles.languageOptions}>
                {availableLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      { 
                        backgroundColor: currentLanguage === lang.code ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <View style={styles.languageOptionContent}>
                      <Text style={[
                        styles.languageOptionText,
                        { color: currentLanguage === lang.code ? colors.background : colors.text }
                      ]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={[
                        styles.languageOptionSubtext,
                        { color: currentLanguage === lang.code ? colors.background : colors.textSecondary }
                      ]}>
                        {lang.name}
                      </Text>
                    </View>
                    {currentLanguage === lang.code && (
                      <CheckCircle size={16} color={colors.background} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Audio Settings */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('audioDetection')}</Text>
            
            <SettingRow
              icon={<Volume2 size={24} color={colors.secondary} />}
              title={t('autoRecording')}
              subtitle={t('autoStart')}
              value={settings.autoRecord}
              onValueChange={(value) => updateSetting('autoRecord', value)}
            />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <SettingsIcon size={24} color={colors.accent} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t('sensitivity')}: {Math.round(modelSettings.sensitivity * 100)}%
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {t('detectionLevel')}
                  </Text>
                </View>
              </View>
              <View style={styles.sliderContainer}>
                <Slider
                  value={modelSettings.sensitivity}
                  onValueChange={(value) => updateModelSettings({ sensitivity: value })}
                  minimumValue={0.1}
                  maximumValue={1.0}
                  step={0.1}
                  style={styles.slider}
                />
                <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>
                  {Math.round(modelSettings.sensitivity * 100)}%
                </Text>
              </View>
            </View>
          </Card>

        {/* ML Model Settings */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('mlModel')}</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Brain size={24} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t('confidenceThreshold')}: {Math.round(modelSettings.confidenceThreshold * 100)}%
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {t('minimumConfidence')}
                  </Text>
                </View>
              </View>
              <View style={styles.sliderContainer}>
                <Slider
                  value={modelSettings.confidenceThreshold}
                  onValueChange={(value) => {
                    updateModelSettings({ confidenceThreshold: value });
                    addNotification({
                      title: currentLanguage === 'hi' ? 'विश्वास सीमा अपडेट हुई' : 'Confidence Threshold Updated',
                      message: currentLanguage === 'hi' 
                        ? `विश्वास सीमा ${Math.round(value * 100)}% पर सेट की गई`
                        : `Confidence threshold set to ${Math.round(value * 100)}%`,
                      type: 'info',
                    });
                  }}
                  minimumValue={0.3}
                  maximumValue={0.95}
                  step={0.05}
                  style={styles.slider}
                />
                <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>
                  {Math.round(modelSettings.confidenceThreshold * 100)}%
                </Text>
              </View>
            </View>
            
            <SettingRow
              icon={<Zap size={24} color={colors.warning} />}
              title={t('preprocessing')}
              subtitle={t('enablePreprocessing')}
              value={modelSettings.enablePreprocessing}
              onValueChange={(value) => {
                updateModelSettings({ enablePreprocessing: value });
                addNotification({
                  title: currentLanguage === 'hi' ? 'प्रीप्रोसेसिंग अपडेट हुई' : 'Preprocessing Updated',
                  message: value 
                    ? (currentLanguage === 'hi' ? 'ऑडियो प्रीप्रोसेसिंग सक्षम की गई' : 'Audio preprocessing enabled')
                    : (currentLanguage === 'hi' ? 'ऑडियो प्रीप्रोसेसिंग अक्षम की गई' : 'Audio preprocessing disabled'),
                  type: 'success',
                });
              }}
            />
            
            <SettingRow
              icon={<Database size={24} color={colors.success} />}
              title={t('postprocessing')}
              subtitle={t('enablePostprocessing')}
              value={modelSettings.enablePostprocessing}
              onValueChange={(value) => {
                updateModelSettings({ enablePostprocessing: value });
                addNotification({
                  title: currentLanguage === 'hi' ? 'पोस्टप्रोसेसिंग अपडेट हुई' : 'Postprocessing Updated',
                  message: value 
                    ? (currentLanguage === 'hi' ? 'परिणाम पोस्टप्रोसेसिंग सक्षम की गई' : 'Result postprocessing enabled')
                    : (currentLanguage === 'hi' ? 'परिणाम पोस्टप्रोसेसिंग अक्षम की गई' : 'Result postprocessing disabled'),
                  type: 'success',
                });
              }}
            />
                onValueChange={handleSensitivityChange}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Sliders size={20} color={colors.primary} />
              <Text style={[styles.advancedToggleText, { color: colors.primary }]}>
                {showAdvanced ? t('hideAdvanced') : t('showAdvanced')}
              </Text>
            </TouchableOpacity>
            
            {showAdvanced && (
              <View style={styles.advancedSettings}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Cpu size={24} color={colors.secondary} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        {t('batchSize')}: {modelSettings.batchSize}
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                        {t('processingBatch')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sliderContainer}>
                    <Slider
                      value={modelSettings.batchSize}
                      onValueChange={(value) => {
                        const newBatchSize = Math.round(value);
                        updateModelSettings({ batchSize: newBatchSize });
                        addNotification({
                          title: currentLanguage === 'hi' ? 'बैच साइज़ अपडेट हुआ' : 'Batch Size Updated',
                          message: currentLanguage === 'hi' 
                            ? `बैच साइज़ ${newBatchSize} पर सेट किया गया`
                            : `Batch size set to ${newBatchSize}`,
                          type: 'info',
                        });
                      }}
                      minimumValue={8}
                      maximumValue={128}
                      step={8}
                      style={styles.slider}
                    />
                    <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>
                      {modelSettings.batchSize}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Activity size={24} color={colors.accent} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        {t('maxDuration')}: {modelSettings.maxDuration}s
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                        {t('maximumAudio')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sliderContainer}>
                    <Slider
                      value={modelSettings.maxDuration}
                      onValueChange={(value) => {
                        const newDuration = Math.round(value);
                        updateModelSettings({ maxDuration: newDuration });
                        addNotification({
                          title: currentLanguage === 'hi' ? 'अधिकतम अवधि अपडेट हुई' : 'Max Duration Updated',
                          message: currentLanguage === 'hi' 
                            ? `अधिकतम अवधि ${newDuration} सेकंड पर सेट की गई`
                            : `Max duration set to ${newDuration} seconds`,
                          type: 'info',
                        });
                      }}
                      minimumValue={10}
                      maximumValue={120}
                      step={5}
                      style={styles.slider}
                    />
                    <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>
                      {modelSettings.maxDuration}s
                    </Text>
                  </View>
                </View>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <BarChart3 size={24} color={colors.primary} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        {t('sampleRate')}: {modelSettings.sampleRate}Hz
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                        {t('audioSample')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sliderContainer}>
                    <Slider
                      value={modelSettings.sampleRate}
                      onValueChange={(value) => {
                        const newSampleRate = Math.round(value);
                        updateModelSettings({ sampleRate: newSampleRate });
                        addNotification({
                          title: currentLanguage === 'hi' ? 'सैंपल रेट अपडेट हुआ' : 'Sample Rate Updated',
                          message: currentLanguage === 'hi' 
                            ? `सैंपल रेट ${newSampleRate}Hz पर सेट किया गया`
                            : `Sample rate set to ${newSampleRate}Hz`,
                          type: 'info',
                        });
                      }}
                      minimumValue={16000}
                      maximumValue={48000}
                      step={4000}
                      style={styles.slider}
                    />
                    <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>
                      {modelSettings.sampleRate}Hz
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Notification Settings */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
            
            <SettingRow
              icon={<Bell size={24} color={colors.warning} />}
              title={t('pushNotifications')}
              subtitle={t('receiveAlerts')}
              value={settings.notifications}
              onValueChange={(value) => updateSetting('notifications', value)}
            />
          </Card>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('aboutSupport')}</Text>
            
            <View style={styles.aboutRow}>
              <Info size={24} color={colors.primary} />
              <View style={styles.aboutText}>
                <Text style={[styles.aboutTitle, { color: colors.text }]}>{t('version')}</Text>
                <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>1.0.0</Text>
              </View>
            </View>

            <View style={styles.aboutRow}>
              <Shield size={24} color={colors.success} />
              <View style={styles.aboutText}>
                <Text style={[styles.aboutTitle, { color: colors.text }]}>{t('privacy')}</Text>
                <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>{t('allLocal')}</Text>
              </View>
            </View>

            <View style={styles.aboutRow}>
              <Smartphone size={24} color={colors.secondary} />
              <View style={styles.aboutText}>
                <Text style={[styles.aboutTitle, { color: colors.text }]}>{t('platform')}</Text>
                <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>
                  {Platform.OS === 'web' ? 'Web' : 'Mobile'}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(600)}>
          <Card style={styles.actionsCard}>
            <Button
              title={t('resetSettings')}
              onPress={resetSettings}
              variant="outline"
              icon={<SettingsIcon size={20} color={colors.primary} />}
            />
            
            <Button
              title={t('getHelp')}
              onPress={() => {
                Alert.alert(
                  currentLanguage === 'hi' ? 'सहायता और समर्थन' : 'Help & Support',
                  currentLanguage === 'hi' 
                    ? 'ऐप के साथ सहायता के लिए हमारे दस्तावेज़ देखें या समर्थन से संपर्क करें।'
                    : 'Visit our documentation or contact support for assistance with the app.',
                  [
                    { text: t('close'), style: 'cancel' },
                    { 
                      text: currentLanguage === 'hi' ? 'AI चैट खोलें' : 'Open AI Chat',
                      onPress: () => {
                        // Navigate to chatbot
                        addNotification({
                          title: currentLanguage === 'hi' ? 'AI सहायक' : 'AI Assistant',
                          message: currentLanguage === 'hi' ? 'AI चैट में जाएं और अपने प्रश्न पूछें' : 'Go to AI Chat and ask your questions',
                          type: 'info',
                        });
                      }
                    }
                  ]
                );
              }}
              variant="ghost"
              icon={<HelpCircle size={20} color={colors.primary} />}
            />
            
            <Button
              title={t('resetMLModel')}
              onPress={handleMLModelReset}
              variant="outline"
              icon={<RotateCcw size={20} color={colors.error} />}
            />
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
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  settingsCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
    maxWidth: '60%',
  },
  settingText: {
    flex: 1,
    flexShrink: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flexWrap: 'wrap',
  },
  sliderContainer: {
    width: '35%',
    alignItems: 'center',
  },
  slider: {
    width: '100%',
  },
  sliderValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  languageSelectorContent: {
    flex: 1,
  },
  selectedLanguage: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  selectedLanguageSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  languageOptions: {
    gap: 8,
    marginTop: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  languageOptionContent: {
    flex: 1,
  },
  languageOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  languageOptionSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  aboutText: {
    flex: 1,
  },
  aboutTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  advancedToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  advancedSettings: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionsCard: {
    gap: 12,
  },
});