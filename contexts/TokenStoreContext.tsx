import type { Region } from '@/hooks/useRegion';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export type TokenType = 'fleet' | 'owner';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  region: Region;
  createdAt: number;
}

interface TokenStoreContextType {
  fleetTokens: StoredTokens | null;
  ownerTokens: StoredTokens | null;
  isLoading: boolean;
  saveTokens: (type: TokenType, tokens: StoredTokens) => Promise<void>;
  clearTokens: (type: TokenType) => Promise<void>;
}

const TokenStoreContext = createContext<TokenStoreContextType | undefined>(
  undefined
);

// Access and refresh tokens are kept under separate keys so no single
// SecureStore value grows large enough to hit the Android size limit.
const storageKeys = (type: TokenType) => ({
  access: `${type}_access_token`,
  refresh: `${type}_refresh_token`,
  meta: `${type}_token_meta`,
});

async function loadTokens(type: TokenType): Promise<StoredTokens | null> {
  const keys = storageKeys(type);
  const [access, refresh, meta] = await Promise.all([
    SecureStore.getItemAsync(keys.access),
    SecureStore.getItemAsync(keys.refresh),
    SecureStore.getItemAsync(keys.meta),
  ]);
  if (!access || !refresh || !meta) return null;
  try {
    const parsed = JSON.parse(meta) as { region: Region; createdAt: number };
    return {
      accessToken: access,
      refreshToken: refresh,
      region: parsed.region,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

async function persistTokens(type: TokenType, tokens: StoredTokens) {
  const keys = storageKeys(type);
  await Promise.all([
    SecureStore.setItemAsync(keys.access, tokens.accessToken),
    SecureStore.setItemAsync(keys.refresh, tokens.refreshToken),
    SecureStore.setItemAsync(
      keys.meta,
      JSON.stringify({ region: tokens.region, createdAt: tokens.createdAt })
    ),
  ]);
}

async function removeTokens(type: TokenType) {
  const keys = storageKeys(type);
  await Promise.all([
    SecureStore.deleteItemAsync(keys.access),
    SecureStore.deleteItemAsync(keys.refresh),
    SecureStore.deleteItemAsync(keys.meta),
  ]);
}

export function TokenStoreProvider({ children }: { children: ReactNode }) {
  const [fleetTokens, setFleetTokens] = useState<StoredTokens | null>(null);
  const [ownerTokens, setOwnerTokens] = useState<StoredTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [fleet, owner] = await Promise.all([
          loadTokens('fleet'),
          loadTokens('owner'),
        ]);
        setFleetTokens(fleet);
        setOwnerTokens(owner);
      } catch (error) {
        console.error('Error loading stored tokens:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const saveTokens = useCallback(
    async (type: TokenType, tokens: StoredTokens) => {
      await persistTokens(type, tokens);
      if (type === 'fleet') setFleetTokens(tokens);
      else setOwnerTokens(tokens);
    },
    []
  );

  const clearTokens = useCallback(async (type: TokenType) => {
    await removeTokens(type);
    if (type === 'fleet') setFleetTokens(null);
    else setOwnerTokens(null);
  }, []);

  return (
    <TokenStoreContext.Provider
      value={{ fleetTokens, ownerTokens, isLoading, saveTokens, clearTokens }}
    >
      {children}
    </TokenStoreContext.Provider>
  );
}

export function useTokenStore(): TokenStoreContextType {
  const context = useContext(TokenStoreContext);
  if (!context) {
    throw new Error('useTokenStore must be used within a TokenStoreProvider');
  }
  return context;
}
