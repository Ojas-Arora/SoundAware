import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  style?: any;
}

export function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  disabled = false,
  style,
}: SliderProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const sliderWidth = Math.min(width - 80, 300); // Max width of 300 or screen width - 80 for padding
  const thumbSize = 20;
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  React.useEffect(() => {
    const percentage = (value - minimumValue) / (maximumValue - minimumValue);
    translateX.value = percentage * (sliderWidth - thumbSize);
  }, [value, minimumValue, maximumValue]);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onChange((event) => {
      const pos = startX.value + event.translationX;
      const newTranslateX = Math.max(0, Math.min(sliderWidth - thumbSize, pos));
      translateX.value = newTranslateX;

      const percentage = newTranslateX / (sliderWidth - thumbSize);
      const newValue = minimumValue + percentage * (maximumValue - minimumValue);
      const steppedValue = Math.round(newValue / step) * step;
      runOnJS(onValueChange)(steppedValue);
    });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const trackFillStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + thumbSize / 2,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.trackFill, { backgroundColor: colors.primary }, trackFillStyle]} />
        <GestureDetector gesture={disabled ? Gesture.Simultaneous() : panGesture}>
          <Animated.View style={[
            styles.thumb, 
            { backgroundColor: colors.primary },
            thumbStyle,
            disabled && styles.disabled
          ]} />
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    width: '100%',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
});