import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type Region = 'intl' | 'cn';

const REGION_STORAGE_KEY = '@myteslamate_tokens_region';

export function useRegion() {
  const [region, setRegionState] = useState<Region>('intl');

  useEffect(() => {
    AsyncStorage.getItem(REGION_STORAGE_KEY).then(stored => {
      if (stored === 'cn' || stored === 'intl') {
        setRegionState(stored);
      }
    });
  }, []);

  const setRegion = async (next: Region) => {
    setRegionState(next);
    try {
      await AsyncStorage.setItem(REGION_STORAGE_KEY, next);
    } catch (error) {
      console.error('Error saving region:', error);
    }
  };

  return { region, setRegion };
}
