import { ThemedText } from '@/components/ThemedText';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useRegion, type Region } from '@/hooks/useRegion';
import { Pressable, StyleSheet, View } from 'react-native';

export function RegionSelector() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { region, setRegion } = useRegion();
  const styles = createStyles(colors);

  const regionOptions: { value: Region; label: string; flag: string }[] = [
    { value: 'intl', label: t('home.regionIntl'), flag: '🌍' },
    { value: 'cn', label: t('home.regionCn'), flag: '🇨🇳' },
  ];

  return (
    <View style={styles.wrapper}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {t('home.regionSectionTitle')}
      </ThemedText>
      <View style={styles.row}>
        {regionOptions.map(option => {
          const isSelected = region === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => setRegion(option.value)}
            >
              <ThemedText
                style={[styles.label, isSelected && styles.labelSelected]}
              >
                {option.flag} {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      gap: 10,
    },
    title: {
      fontSize: 14,
      opacity: 0.7,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    buttonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
    },
    labelSelected: {
      color: '#fff',
    },
  });
