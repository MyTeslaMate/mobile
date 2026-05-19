import i18n from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

const STORAGE_KEY = 'myteslamate_tokens_biometric_lock';

interface BiometricContextType {
  isAvailable: boolean;
  isEnabled: boolean;
  isLocked: boolean;
  isLoading: boolean;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  unlock: () => Promise<boolean>;
}

const BiometricContext = createContext<BiometricContextType | undefined>(
  undefined
);

export function BiometricProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const enabledRef = useRef(false);
  const authInProgress = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [hasHardware, isEnrolled, saved] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          AsyncStorage.getItem(STORAGE_KEY),
        ]);
        const available = hasHardware && isEnrolled;
        const enabled = available && saved === 'true';
        setIsAvailable(available);
        setIsEnabled(enabled);
        setIsLocked(enabled);
        enabledRef.current = enabled;
      } catch (error) {
        console.error('Error initializing biometric lock:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' && enabledRef.current) {
        setIsLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const authenticate = useCallback(async () => {
    if (authInProgress.current) return false;
    authInProgress.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: i18n.t('biometric.prompt'),
      });
      return result.success;
    } catch {
      return false;
    } finally {
      authInProgress.current = false;
    }
  }, []);

  const unlock = useCallback(async () => {
    const success = await authenticate();
    if (success) setIsLocked(false);
    return success;
  }, [authenticate]);

  const enable = useCallback(async () => {
    if (!isAvailable) return false;
    const success = await authenticate();
    if (!success) return false;
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    enabledRef.current = true;
    setIsEnabled(true);
    setIsLocked(false);
    return true;
  }, [authenticate, isAvailable]);

  const disable = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    enabledRef.current = false;
    setIsEnabled(false);
    setIsLocked(false);
  }, []);

  return (
    <BiometricContext.Provider
      value={{
        isAvailable,
        isEnabled,
        isLocked,
        isLoading,
        enable,
        disable,
        unlock,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric(): BiometricContextType {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within a BiometricProvider');
  }
  return context;
}
