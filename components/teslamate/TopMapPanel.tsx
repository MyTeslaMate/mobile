import { ThemedText } from '@/components/ThemedText';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

export interface MapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  type?: 'charge' | 'drive-start' | 'drive-end';
  label?: string | number;
}

interface Props {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  height?: number;
}

/**
 * Shared "list header" map. Renders a single MapView (cheap) and fits all
 * given markers so the user gets a quick spatial overview of the entire
 * list. Tap a marker to surface the matching list item (caller decides what
 * to do via `onMarkerPress`, usually scroll-to-index or push to detail).
 */
export function TopMapPanel({ markers, onMarkerPress, height = 220 }: Props) {
  const colors = useThemeColors();
  const mapRef = useRef<MapView>(null);

  const region = useMemo(() => fitRegion(markers), [markers]);

  // Re-fit when the set of coordinates changes (filter, refresh, …).
  useEffect(() => {
    if (!mapRef.current) return;
    if (markers.length === 0) return;
    if (markers.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: markers[0].latitude,
          longitude: markers[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        300
      );
      return;
    }
    mapRef.current.fitToCoordinates(
      markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }
    );
  }, [markers]);

  if (markers.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.cardBackground }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region ?? undefined}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            onPress={() => onMarkerPress?.(m)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <Pin type={m.type ?? 'charge'} label={m.label} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

function Pin({
  type,
  label,
}: {
  type: NonNullable<MapMarker['type']>;
  label?: string | number;
}) {
  const colors = useThemeColors();
  const color =
    type === 'charge'
      ? colors.primary
      : type === 'drive-start'
        ? '#4CAF50'
        : colors.primary;
  const icon: any =
    type === 'charge' ? 'flash' : type === 'drive-start' ? 'navigate' : 'flag';

  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      {label != null ? (
        <ThemedText style={styles.pinLabel}>{label}</ThemedText>
      ) : (
        <Ionicons name={icon} size={12} color="#fff" />
      )}
    </View>
  );
}

function fitRegion(markers: MapMarker[]) {
  if (markers.length === 0) return null;
  const lats = markers.map((m) => m.latitude);
  const lngs = markers.map((m) => m.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.02),
  };
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  pin: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinLabel: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14 },
});
