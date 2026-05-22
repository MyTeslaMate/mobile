import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { listCars, TeslaMateApiError, type TmCar } from '@/lib/teslaMateApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'mtm_selected_car_id_v1';

export interface SelectedCarContextValue {
  cars: TmCar[];
  selectedCarId: number | null;
  setSelectedCarId: (id: number) => void;
  isLoading: boolean;
  error: 'unauthorized' | 'network' | 'http_error' | null;
  refresh: () => Promise<void>;
}

const SelectedCarContext = createContext<SelectedCarContextValue | undefined>(
  undefined
);

export function SelectedCarProvider({ children }: { children: ReactNode }) {
  const { session } = useTeslaMateApi();
  const [cars, setCars] = useState<TmCar[]>([]);
  const [selectedCarId, setSelectedCarIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SelectedCarContextValue['error']>(null);

  // Hydrate the last selected car id from storage on mount so the choice
  // survives app restarts.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed)) setSelectedCarIdState(parsed);
      } catch {
        // ignore — falls back to first car
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!session) {
      setCars([]);
      setSelectedCarIdState(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await listCars(session);
      setCars(list);
      setSelectedCarIdState((prev) => {
        if (prev && list.some((c) => c.car_id === prev)) return prev;
        const first = list[0]?.car_id ?? null;
        if (first != null) {
          AsyncStorage.setItem(STORAGE_KEY, String(first)).catch(() => {});
        }
        return first;
      });
    } catch (e) {
      if (e instanceof TeslaMateApiError) {
        setError(e.code);
      } else {
        setError('network');
      }
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const setSelectedCarId = useCallback((id: number) => {
    setSelectedCarIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, String(id)).catch(() => {});
  }, []);

  const value = useMemo<SelectedCarContextValue>(
    () => ({ cars, selectedCarId, setSelectedCarId, isLoading, error, refresh: load }),
    [cars, selectedCarId, setSelectedCarId, isLoading, error, load]
  );

  return (
    <SelectedCarContext.Provider value={value}>
      {children}
    </SelectedCarContext.Provider>
  );
}

export function useSelectedCar(): SelectedCarContextValue {
  const ctx = useContext(SelectedCarContext);
  if (!ctx) {
    throw new Error('useSelectedCar must be used within a SelectedCarProvider');
  }
  return ctx;
}
