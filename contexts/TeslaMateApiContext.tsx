import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface TeslaMateSession {
  token: string;
  endpoint: string;
  authType: 'bearer' | 'basic';
  email: string;
  name: string;
}

interface TeslaMateApiContextType {
  session: TeslaMateSession | null;
  isLoading: boolean;
  signIn: (session: TeslaMateSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const TeslaMateApiContext = createContext<TeslaMateApiContextType | undefined>(
  undefined
);

const STORAGE_KEY = 'mtm_session_v1';

async function readSession(): Promise<TeslaMateSession | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.endpoint !== 'string' ||
      (parsed.authType !== 'bearer' && parsed.authType !== 'basic')
    ) {
      return null;
    }
    return {
      token: parsed.token,
      endpoint: parsed.endpoint,
      authType: parsed.authType,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      name: typeof parsed.name === 'string' ? parsed.name : '',
    };
  } catch {
    return null;
  }
}

export function TeslaMateApiProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TeslaMateSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setSession(await readSession());
      } catch (e) {
        console.error('Failed to read MTM session', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (next: TeslaMateSession) => {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut }),
    [session, isLoading, signIn, signOut]
  );

  return (
    <TeslaMateApiContext.Provider value={value}>
      {children}
    </TeslaMateApiContext.Provider>
  );
}

export function useTeslaMateApi(): TeslaMateApiContextType {
  const ctx = useContext(TeslaMateApiContext);
  if (!ctx) {
    throw new Error(
      'useTeslaMateApi must be used within a TeslaMateApiProvider'
    );
  }
  return ctx;
}
