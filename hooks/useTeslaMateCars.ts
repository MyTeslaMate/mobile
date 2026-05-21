import { useTeslaMateApi } from '@/contexts/TeslaMateApiContext';
import { listCars, TeslaMateApiError, type TmCar } from '@/lib/teslaMateApi';
import { useCallback, useEffect, useState } from 'react';

export interface UseTeslaMateCarsResult {
  cars: TmCar[];
  selectedCarId: number | null;
  setSelectedCarId: (id: number) => void;
  isLoading: boolean;
  error: 'unauthorized' | 'network' | 'http_error' | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the user's TeslaMate cars and keeps a "currently selected" car in
 * memory across the four data tabs. The first car is auto-selected; switching
 * persists for the lifetime of the app session (not across restarts).
 */
export function useTeslaMateCars(): UseTeslaMateCarsResult {
  const { session } = useTeslaMateApi();
  const [cars, setCars] = useState<TmCar[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<UseTeslaMateCarsResult['error']>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await listCars(session);
      setCars(list);
      setSelectedCarId((prev) => {
        if (prev && list.some((c) => c.car_id === prev)) return prev;
        return list[0]?.car_id ?? null;
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

  return { cars, selectedCarId, setSelectedCarId, isLoading, error, refresh: load };
}
