import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

export default function TabsLayout() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { session, isLoading } = useTeslaMateApi();

  if (isLoading) return null;
  if (!session) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.borderColor,
        },
      }}
    >
      <Tabs.Screen
        name="now"
        options={{
          title: t('tabs.now'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-sport" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="drives"
        options={{
          title: t('tabs.drives'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="charges"
        options={{
          title: t('tabs.charges'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
