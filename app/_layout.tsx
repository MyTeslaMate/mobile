import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { BackOrCloseHeaderLeft } from '@/components/BackOrCloseHeaderLeft';
import { BiometricGate } from '@/components/BiometricGate';
import { UpdateGate } from '@/components/UpdateGate';
import { BiometricProvider } from '@/contexts/BiometricContext';
import { LocalizationProvider } from '@/contexts/LocalizationContext';
import {
  ThemeProvider as CustomThemeProvider,
  useTheme,
} from '@/contexts/ThemeContext';
import { DateRangeProvider } from '@/contexts/DateRangeContext';
import { SelectedCarProvider } from '@/contexts/SelectedCarContext';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <CustomThemeProvider>
      <LocalizationProvider>
        <RegionProvider>
          <TokenStoreProvider>
            <TeslaMateApiProvider>
              <SelectedCarProvider>
                <DateRangeProvider>
                <BiometricProvider>
                  <NavigationWrapper>
                  <UpdateGate>
                    <BiometricGate>
                      <Stack
                        screenOptions={{
                          headerBackButtonDisplayMode: 'minimal',
                        }}
                      >
                        <Stack.Screen
                          name="(tabs)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="onboarding"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="connect"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="drives/[id]"
                          options={{ headerShown: true }}
                        />
                        <Stack.Screen
                          name="charges/[id]"
                          options={{ headerShown: true }}
                        />
                        <Stack.Screen
                          name="settings/mtm-token"
                          options={{
                            headerShown: true,
                            headerLeft: () => <BackOrCloseHeaderLeft />,
                          }}
                        />
                        <Stack.Screen
                          name="settings/owner-token"
                          options={{
                            headerShown: true,
                            headerLeft: () => <BackOrCloseHeaderLeft />,
                          }}
                        />
                        <Stack.Screen
                          name="settings/fleet-token"
                          options={{
                            headerShown: true,
                            headerLeft: () => <BackOrCloseHeaderLeft />,
                          }}
                        />
                        <Stack.Screen
                          name="assistant"
                          options={{
                            presentation: 'modal',
                            headerShown: false,
                          }}
                        />
                        <Stack.Screen
                          name="auth"
                          options={{ headerShown: false }}
                        />
                      </Stack>
                    </BiometricGate>
                  </UpdateGate>
                </NavigationWrapper>
                </BiometricProvider>
                </DateRangeProvider>
              </SelectedCarProvider>
            </TeslaMateApiProvider>
          </TokenStoreProvider>
        </RegionProvider>
      </LocalizationProvider>
    </CustomThemeProvider>
    </GestureHandlerRootView>
  );
}
