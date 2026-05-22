import { ThemedText } from '@/components/ThemedText';
import { useThemeColors } from '@/contexts/ThemeContext';
import { formatCarName } from '@/lib/format';
import type { TmCar } from '@/lib/teslaMateApi';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface CarPickerProps {
  cars: TmCar[];
  selectedCarId: number | null;
  onSelect: (id: number) => void;
}

export function CarPicker({ cars, selectedCarId, onSelect }: CarPickerProps) {
  const colors = useThemeColors();
  if (cars.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {cars.map((car) => {
        const isSelected = car.car_id === selectedCarId;
        return (
          <Pressable
            key={car.car_id}
            onPress={() => onSelect(car.car_id)}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.cardBackground,
                borderColor: isSelected ? colors.primary : colors.borderColor,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.label,
                { color: isSelected ? '#fff' : colors.text },
              ]}
              numberOfLines={1}
            >
              {formatCarName(car)}
            </ThemedText>
          </Pressable>
        );
      })}
      <View style={{ width: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
