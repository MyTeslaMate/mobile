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
  id: string;
  accessToken: string;
  refreshToken: string;
  region: Region;
  createdAt: number;
}

export type StoredTokensInput = Omit<StoredTokens, 'id'>;

interface TokenStoreContextType {
  fleetTokens: StoredTokens[];
  ownerTokens: StoredTokens[];
  isLoading: boolean;
  saveTokens: (type: TokenType, tokens: StoredTokensInput) => Promise<void>;
  clearToken: (type: TokenType, id: string) => Promise<void>;
  clearTokens: (type: TokenType) => Promise<void>;
}

const TokenStoreContext = createContext<TokenStoreContextType | undefined>(
  undefined
);

// Access and refresh tokens are kept under separate keys so no single
// SecureStore value grows large enough to hit the Android size limit.
const indexKey = (type: TokenType) => `${type}_token_index`;
const itemKeys = (type: TokenType, id: string) => ({
  access: `${type}_${id}_access_token`,
  refresh: `${type}_${id}_refresh_token`,
  meta: `${type}_${id}_token_meta`,
});

// Legacy single-token keys, kept here only for one-time migration.
const legacyKeys = (type: TokenType) => ({
  access: `${type}_access_token`,
  refresh: `${type}_refresh_token`,
  meta: `${type}_token_meta`,
});

function newId(createdAt: number) {
  return `${createdAt}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

async function readIndex(type: TokenType): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(indexKey(type));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

async function writeIndex(type: TokenType, ids: string[]) {
  await SecureStore.setItemAsync(indexKey(type), JSON.stringify(ids));
}

async function readToken(
  type: TokenType,
  id: string
): Promise<StoredTokens | null> {
  const keys = itemKeys(type, id);
  const [access, refresh, meta] = await Promise.all([
    SecureStore.getItemAsync(keys.access),
    SecureStore.getItemAsync(keys.refresh),
    SecureStore.getItemAsync(keys.meta),
  ]);
  if (!access || !refresh || !meta) return null;
  try {
    const parsed = JSON.parse(meta) as { region: Region; createdAt: number };
    return {
      id,
      accessToken: access,
      refreshToken: refresh,
      region: parsed.region,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

async function writeToken(type: TokenType, token: StoredTokens) {
  const keys = itemKeys(type, token.id);
  await Promise.all([
    SecureStore.setItemAsync(keys.access, token.accessToken),
    SecureStore.setItemAsync(keys.refresh, token.refreshToken),
    SecureStore.setItemAsync(
      keys.meta,
      JSON.stringify({ region: token.region, createdAt: token.createdAt })
    ),
  ]);
}

async function removeToken(type: TokenType, id: string) {
  const keys = itemKeys(type, id);
  await Promise.all([
    SecureStore.deleteItemAsync(keys.access),
    SecureStore.deleteItemAsync(keys.refresh),
    SecureStore.deleteItemAsync(keys.meta),
  ]);
}

async function migrateLegacyToken(
  type: TokenType
): Promise<StoredTokens | null> {
  const keys = legacyKeys(type);
  const [access, refresh, meta] = await Promise.all([
    SecureStore.getItemAsync(keys.access),
    SecureStore.getItemAsync(keys.refresh),
    SecureStore.getItemAsync(keys.meta),
  ]);
  if (!access || !refresh || !meta) return null;
  let parsed: { region: Region; createdAt: number };
  try {
    parsed = JSON.parse(meta);
  } catch {
    await Promise.all([
      SecureStore.deleteItemAsync(keys.access),
      SecureStore.deleteItemAsync(keys.refresh),
      SecureStore.deleteItemAsync(keys.meta),
    ]);
    return null;
  }
  const token: StoredTokens = {
    id: newId(parsed.createdAt),
    accessToken: access,
    refreshToken: refresh,
    region: parsed.region,
    createdAt: parsed.createdAt,
  };
  await writeToken(type, token);
  await Promise.all([
    SecureStore.deleteItemAsync(keys.access),
    SecureStore.deleteItemAsync(keys.refresh),
    SecureStore.deleteItemAsync(keys.meta),
  ]);
  return token;
}

async function loadTokens(type: TokenType): Promise<StoredTokens[]> {
  let ids = await readIndex(type);

  const migrated = await migrateLegacyToken(type);
  if (migrated) {
    ids = [...ids, migrated.id];
    await writeIndex(type, ids);
  }

  const tokens = await Promise.all(ids.map((id) => readToken(type, id)));
  return tokens
    .filter((t): t is StoredTokens => t !== null)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function TokenStoreProvider({ children }: { children: ReactNode }) {
  const [fleetTokens, setFleetTokens] = useState<StoredTokens[]>([]);
  const [ownerTokens, setOwnerTokens] = useState<StoredTokens[]>([]);
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
    async (type: TokenType, input: StoredTokensInput) => {
      const token: StoredTokens = { ...input, id: newId(input.createdAt) };
      await writeToken(type, token);
      const ids = await readIndex(type);
      await writeIndex(type, [...ids, token.id]);
      const setter = type === 'fleet' ? setFleetTokens : setOwnerTokens;
      setter((prev) => [...prev, token]);
    },
    []
  );

  const clearToken = useCallback(async (type: TokenType, id: string) => {
    await removeToken(type, id);
    const ids = await readIndex(type);
    await writeIndex(
      type,
      ids.filter((existing) => existing !== id)
    );
    const setter = type === 'fleet' ? setFleetTokens : setOwnerTokens;
    setter((prev) => prev.filter((token) => token.id !== id));
  }, []);

  const clearTokens = useCallback(async (type: TokenType) => {
    const ids = await readIndex(type);
    await Promise.all(ids.map((id) => removeToken(type, id)));
    await SecureStore.deleteItemAsync(indexKey(type));
    if (type === 'fleet') setFleetTokens([]);
    else setOwnerTokens([]);
  }, []);

  return (
    <TokenStoreContext.Provider
      value={{
        fleetTokens,
        ownerTokens,
        isLoading,
        saveTokens,
        clearToken,
        clearTokens,
      }}
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
