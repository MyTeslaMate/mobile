import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

export type Region = 'intl' | 'cn';

const REGION_STORAGE_KEY = '@mtm_tokens_region';

interface RegionContextType {
  region: Region;
  setRegion: (next: Region) => Promise<void>;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: ReactNode }) {
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

  return React.createElement(
    RegionContext.Provider,
    { value: { region, setRegion } },
    children
  );
}

export function useRegion(): RegionContextType {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}
