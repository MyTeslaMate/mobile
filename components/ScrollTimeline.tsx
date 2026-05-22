import { type SupportedLanguage } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { formatMonthYear } from '@/lib/format';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ScrollTimelineProps {
  listRef: RefObject<FlatList<any> | null>;
  itemCount: number;
  getDateAt: (index: number) => string | undefined;
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  layoutHeight: SharedValue<number>;
  locale: SupportedLanguage;
}

const THUMB_HEIGHT = 32;
const THUMB_WIDTH = 12;
const TRACK_WIDTH = 3;
const TOUCH_WIDTH = 28;

export function ScrollTimeline({
  listRef,
  itemCount,
  getDateAt,
  scrollY,
  contentHeight,
  layoutHeight,
  locale,
}: ScrollTimelineProps) {
  const colors = useThemeColors();
  const [bubbleLabel, setBubbleLabel] = useState<string>('');
  const dragging = useSharedValue(0);
  const scrolling = useSharedValue(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef({ itemCount, getDateAt, locale });
  stateRef.current = { itemCount, getDateAt, locale };

  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    []
  );

  const progress = useDerivedValue(() => {
    const denom = Math.max(1, contentHeight.value - layoutHeight.value);
    return Math.min(1, Math.max(0, scrollY.value / denom));
  });

  const thumbStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, layoutHeight.value - THUMB_HEIGHT);
    const active = Math.max(dragging.value, scrolling.value);
    return {
      transform: [{ translateY: progress.value * usable }],
      opacity: 0.35 + active * 0.65,
    };
  });

  const trackStyle = useAnimatedStyle(() => {
    const active = Math.max(dragging.value, scrolling.value);
    return { opacity: 0.15 + active * 0.4 };
  });

  const bubbleStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, layoutHeight.value - THUMB_HEIGHT);
    return {
      transform: [{ translateY: progress.value * usable - 4 }],
      opacity: Math.max(dragging.value, scrolling.value),
    };
  });

  const updateLabel = (progressValue: number) => {
    const { itemCount, getDateAt, locale } = stateRef.current;
    if (itemCount <= 0) return;
    const index = Math.max(
      0,
      Math.min(itemCount - 1, Math.floor(progressValue * itemCount))
    );
    const date = getDateAt(index);
    const next = date ? formatMonthYear(date, locale) : '';
    setBubbleLabel((prev) => (prev === next ? prev : next));
  };

  const scheduleHide = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      scrolling.value = withTiming(0, { duration: 400 });
    }, 700);
  };

  useAnimatedReaction(
    () => progress.value,
    (curr, prev) => {
      if (prev === null) return;
      if (curr === prev) return;
      if (dragging.value > 0.05) return;
      scrolling.value = withTiming(1, { duration: 100 });
      runOnJS(updateLabel)(curr);
      runOnJS(scheduleHide)();
    }
  );

  const scrollTo = (offset: number) => {
    listRef.current?.scrollToOffset({ offset, animated: false });
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      dragging.value = withTiming(1, { duration: 120 });
      const usable = Math.max(1, layoutHeight.value);
      const p = Math.min(1, Math.max(0, e.y / usable));
      const offset = p * Math.max(0, contentHeight.value - layoutHeight.value);
      runOnJS(scrollTo)(offset);
      runOnJS(updateLabel)(p);
    })
    .onUpdate((e) => {
      'worklet';
      const usable = Math.max(1, layoutHeight.value);
      const p = Math.min(1, Math.max(0, e.y / usable));
      const offset = p * Math.max(0, contentHeight.value - layoutHeight.value);
      runOnJS(scrollTo)(offset);
      runOnJS(updateLabel)(p);
    })
    .onFinalize(() => {
      'worklet';
      dragging.value = withTiming(0, { duration: 220 });
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container} pointerEvents="box-only">
        <Animated.View
          style={[
            styles.track,
            { backgroundColor: colors.textSecondary },
            trackStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: colors.primary },
            thumbStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            { backgroundColor: colors.primary },
            bubbleStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={styles.bubbleText} numberOfLines={1}>
            {bubbleLabel || '…'}
          </Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: TOUCH_WIDTH,
  },
  track: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    right: (TOUCH_WIDTH - TRACK_WIDTH) / 2,
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    right: (TOUCH_WIDTH - THUMB_WIDTH) / 2,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_WIDTH / 2,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    right: TOUCH_WIDTH + 4,
    width: 130,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'capitalize',
  },
});
