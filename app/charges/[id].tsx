import { ChartCard } from '@/components/charts/ChartCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { formatCost, formatDate, formatDuration, formatKm, formatKwh } from '@/lib/format';
import { getCharge, type TmChargeDetail } from '@/lib/teslaMateApi';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChargeDetailScreen() {
  const colors = useThemeColors();
  const { t, currentLanguage } = useLocalization();
  const { session } = useTeslaMateApi();
  const params = useLocalSearchParams<{ id: string; carId?: string }>();

  const chargeId = parseInt(params.id || '0', 10);
  const carId = parseInt(params.carId || '0', 10);

  const [charge, setCharge] = useState<TmChargeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !carId || !chargeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCharge(session, carId, chargeId)
      .then((c) => {
        if (cancelled) return;
        setCharge(c);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? 'unknown');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, carId, chargeId]);

  const styles = createStyles(colors);

  const startSoc = charge?.battery_details?.start_battery_level ?? null;
  const endSoc = charge?.battery_details?.end_battery_level ?? null;
  const isFull = endSoc === 100;
  const socDelta = startSoc != null && endSoc != null ? endSoc - startSoc : null;

  const durationHours = (charge?.duration_min ?? 0) / 60;
  const avgPower =
    charge?.charge_energy_added && durationHours > 0
      ? charge.charge_energy_added / durationHours
      : null;

  const lat = charge?.latitude ?? null;
  const lng = charge?.longitude ?? null;
  const hasCoords = lat != null && lng != null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: t('details.chargeTitle') }} />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <ThemedView style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.primary} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}

      {!loading && !error && charge && (
        <ScrollView contentContainerStyle={styles.container}>
          <ThemedView style={styles.heroCard}>
            {hasCoords && (
              <View style={styles.mapWrap}>
                <MapView
                  provider={PROVIDER_DEFAULT}
                  style={StyleSheet.absoluteFillObject}
                  region={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker coordinate={{ latitude: lat, longitude: lng }}>
                    <View style={styles.pin}>
                      <Ionicons name="flash" size={14} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
                <View style={styles.mapOverlay}>
                  <View style={styles.batRow}>
                    <Ionicons
                      name={isFull ? 'battery-full' : 'battery-charging'}
                      size={20}
                      color={isFull ? '#4CAF50' : '#fff'}
                    />
                    <ThemedText style={styles.batOverlay}>
                      {startSoc ?? '—'}%
                    </ThemedText>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                    <ThemedText style={styles.batOverlay}>
                      {endSoc ?? '—'}%
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.heroFooter}>
              {charge.address && (
                <ThemedText style={styles.addrCompact} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={colors.textSecondary} />{' '}
                  {charge.address}
                </ThemedText>
              )}
              <ThemedText style={styles.dateText}>
                {formatDate(charge.start_date, currentLanguage)}
              </ThemedText>
            </View>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={styles.grid}>
              <Stat
                icon="flash"
                label={t('details.energyAdded')}
                value={formatKwh(charge.charge_energy_added)}
              />
              {charge.charge_energy_used != null && (
                <Stat
                  icon="power"
                  label={t('details.energyUsed')}
                  value={formatKwh(charge.charge_energy_used)}
                />
              )}
              <Stat
                icon="time"
                label={t('trip.duration')}
                value={charge.duration_str ?? formatDuration(charge.duration_min)}
              />
              {avgPower != null && (
                <Stat
                  icon="speedometer"
                  label={t('details.avgPower')}
                  value={`${avgPower.toFixed(1)} kW`}
                />
              )}
              {socDelta != null && (
                <Stat
                  icon="battery-charging"
                  label={t('details.added')}
                  value={`+${socDelta}%`}
                />
              )}
              {formatCost(charge.cost, charge.currency) && (
                <Stat
                  icon="card"
                  label={t('details.cost')}
                  value={formatCost(charge.cost, charge.currency)!}
                />
              )}
              {charge.range_rated?.start_range != null && (
                <Stat
                  icon="speedometer-outline"
                  label={t('details.start')}
                  value={formatKm(charge.range_rated.start_range)}
                />
              )}
              {charge.range_rated?.end_range != null && (
                <Stat
                  icon="map-outline"
                  label={t('details.end')}
                  value={formatKm(charge.range_rated.end_range)}
                />
              )}
            </View>
          </ThemedView>

          {charge.charge_details && charge.charge_details.length >= 2 && (
            <>
              <ChartCard
                title={t('details.battery')}
                icon="battery-half"
                iconColor="#4CAF50"
                color="#4CAF50"
                data={charge.charge_details.map((d) => d.battery_level)}
                unit="%"
                yMin={0}
                yMax={100}
                height={90}
              />
              <ChartCard
                title={t('details.power')}
                icon="flash"
                iconColor="#FF9800"
                color="#FF9800"
                data={charge.charge_details.map((d) => d.charger_details?.charger_power)}
                unit="kW"
                yMin={0}
                height={90}
              />
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({
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
    <View style={statStyles.stat}>
      <View style={[statStyles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={statStyles.label}>{label}</ThemedText>
        <ThemedText type="defaultSemiBold" style={statStyles.value}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '31%' },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, opacity: 0.65 },
  value: { fontSize: 13 },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 12, gap: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorCard: {
      margin: 16,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.cardBackground,
    },
    errorText: { flex: 1, opacity: 0.85 },
    heroCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      overflow: 'hidden',
    },
    mapWrap: { height: 130, backgroundColor: colors.background },
    mapOverlay: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    pin: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: '#fff',
    },
    heroFooter: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 12,
      gap: 10,
    },
    batRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    batOverlay: { color: '#fff', fontSize: 16, fontWeight: '700' },
    addrCompact: { fontSize: 13, opacity: 0.9 },
    dateText: { fontSize: 11, opacity: 0.65 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 6 },
  });
