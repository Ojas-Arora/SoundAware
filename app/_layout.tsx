import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SoundDetectionProvider } from '@/contexts/SoundDetectionContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { MLModelProvider } from '@/contexts/MLModelContext';
import { AIAssistantProvider } from '@/contexts/AIAssistantContext';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// This is the root layout for the app
function AppContent() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SoundDetectionProvider>
          <NotificationProvider>
            <MLModelProvider>
              <AIAssistantProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </AIAssistantProvider>
            </MLModelProvider>
          </NotificationProvider>
        </SoundDetectionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // On web, we don't need GestureHandlerRootView
  if (Platform.OS === 'web') {
    return <AppContent />;
  }

  // On mobile, wrap with GestureHandlerRootView
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}