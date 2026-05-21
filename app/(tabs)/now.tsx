import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CarPicker } from '@/components/teslamate/CarPicker';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useTeslaMateCars } from '@/hooks/useTeslaMateCars';
import {
  getCarStatus,
  TeslaMateApiError,
  type TmCarStatus,
} from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NowScreen() {
  const colors = useThemeColors();
  const { t } = useLocalization();
  const { session } = useTeslaMateApi();
  const { cars, selectedCarId, setSelectedCarId, isLoading: carsLoading, refresh: refreshCars } =
    useTeslaMateCars();

  const [status, setStatus] = useState<TmCarStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!session || !selectedCarId) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      setStatus(await getCarStatus(session, selectedCarId));
    } catch (e) {
      setStatus(null);
      setStatusError(e instanceof TeslaMateApiError ? e.code : 'network');
    } finally {
      setStatusLoading(false);
    }
  }, [session, selectedCarId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onRefresh = async () => {
    await refreshCars();
    await loadStatus();
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ThemedText type="title">{t('now.title')}</ThemedText>
      </View>

      <CarPicker
        cars={cars}
        selectedCarId={selectedCarId}
        onSelect={setSelectedCarId}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={statusLoading || carsLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {!carsLoading && cars.length === 0 && (
          <EmptyMessage label={t('now.noVehicles')} />
        )}

        {statusError && (
          <ThemedView style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.primary} />
            <ThemedText style={styles.errorText}>
              {t('now.noData')}
            </ThemedText>
          </ThemedView>
        )}

        {status && (
          <ThemedView style={styles.card}>
            <StatusRow
              icon="battery-half"
              label={t('now.battery')}
              value={formatBattery(status)}
            />
            <Divider />
            <StatusRow
              icon="flash"
              label={t('now.chargingState')}
              value={status.charging_details?.charging_state ?? '—'}
            />
            <Divider />
            <StatusRow
              icon="cellular"
              label={t('now.onlineState')}
              value={status.state ?? '—'}
            />
            <Divider />
            <StatusRow
              icon="location"
              label={t('now.location')}
              value={
                status.car_geodata?.geofence ??
                formatCoordinates(status.car_geodata) ??
                '—'
              }
            />
            <Divider />
            <StatusRow
              icon="construct"
              label={t('now.softwareVersion')}
              value={status.car_details?.car_version ?? '—'}
            />
          </ThemedView>
        )}

        {!status && !statusError && !carsLoading && cars.length > 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <ThemedText style={rowStyles.label}>{label}</ThemedText>
      <ThemedText style={rowStyles.value} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.borderColor,
      }}
    />
  );
}

function EmptyMessage({ label }: { label: string }) {
  return (
    <ThemedView style={emptyStyles.container}>
      <ThemedText style={emptyStyles.text}>{label}</ThemedText>
    </ThemedView>
  );
}

function formatBattery(status: TmCarStatus): string {
  const level =
    status.battery_details?.usable_battery_level ??
    status.battery_details?.battery_level;
  const range = status.battery_details?.est_battery_range_km;
  if (level == null) return '—';
  if (range != null) return `${level}% · ${Math.round(range)} km`;
  return `${level}%`;
}

function formatCoordinates(geo: TmCarStatus['car_geodata']): string | null {
  if (!geo || geo.latitude == null || geo.longitude == null) return null;
  return `${geo.latitude.toFixed(3)}, ${geo.longitude.toFixed(3)}`;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    opacity: 0.85,
    maxWidth: '55%',
    textAlign: 'right',
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  text: {
    opacity: 0.7,
    textAlign: 'center',
  },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    container: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingHorizontal: 16,
    },
    errorCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      opacity: 0.8,
    },
    loadingContainer: {
      padding: 32,
      alignItems: 'center',
    },
  });
