import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import 'react-native-reanimated';

import { BiometricGate } from '@/components/BiometricGate';
import { UpdateGate } from '@/components/UpdateGate';
import { BiometricProvider } from '@/contexts/BiometricContext';
import { LocalizationProvider } from '@/contexts/LocalizationContext';
import {
  ThemeProvider as CustomThemeProvider,
  useTheme,
} from '@/contexts/ThemeContext';
import { TeslaMateApiProvider } from '@/contexts/TeslaMateApiContext';
import { TokenStoreProvider } from '@/contexts/TokenStoreContext';
import { RegionProvider } from '@/hooks/useRegion';
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
        <RegionProvider>
          <TokenStoreProvider>
            <TeslaMateApiProvider>
              <BiometricProvider>
                <NavigationWrapper>
                  <UpdateGate>
                    <BiometricGate>
                      <Stack>
                        <Stack.Screen
                          name="(tabs)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="onboarding"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="settings/tokens"
                          options={{ headerShown: true }}
                        />
                      </Stack>
                    </BiometricGate>
                  </UpdateGate>
                </NavigationWrapper>
              </BiometricProvider>
            </TeslaMateApiProvider>
          </TokenStoreProvider>
        </RegionProvider>
      </LocalizationProvider>
    </CustomThemeProvider>
  );
}
