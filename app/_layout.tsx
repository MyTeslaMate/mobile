import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import 'react-native-reanimated';

import { LocalizationProvider } from '@/contexts/LocalizationContext';
import {
  ThemeProvider as CustomThemeProvider,
  useTheme,
} from '@/contexts/ThemeContext';
import '@/i18n';

function NavigationWrapper({ children }: { children: ReactNode }) {
  const { state } = useTheme();

  const navigationTheme = {
    ...(state.activeTheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(state.activeTheme === 'dark'
        ? DarkTheme.colors
        : DefaultTheme.colors),
      primary: state.colors.primary,
      background: state.colors.background,
      card: state.colors.cardBackground,
      text: state.colors.text,
      border: state.colors.borderColor,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      {children}
      <StatusBar style={state.activeTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <CustomThemeProvider>
      <LocalizationProvider>
        <NavigationWrapper>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </NavigationWrapper>
      </LocalizationProvider>
    </CustomThemeProvider>
  );
}
