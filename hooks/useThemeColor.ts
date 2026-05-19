import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { state } = useTheme();
  const colorFromProps = props[state.activeTheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return state.colors[colorName];
  }
}
