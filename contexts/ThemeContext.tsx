import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ActiveTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  colors: typeof Colors.light | typeof Colors.dark;
  isLoading: boolean;
}

type ThemeAction =
  | { type: 'SET_THEME_MODE'; payload: ThemeMode }
  | { type: 'SET_ACTIVE_THEME'; payload: ActiveTheme }
  | { type: 'SET_LOADING'; payload: boolean };

const THEME_STORAGE_KEY = 'myteslamate_tokens_theme_mode';

const initialState: ThemeState = {
  mode: 'auto',
  activeTheme: 'light',
  colors: Colors.light,
  isLoading: true,
};

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'SET_THEME_MODE':
      return { ...state, mode: action.payload };
    case 'SET_ACTIVE_THEME':
      const colors = action.payload === 'dark' ? Colors.dark : Colors.light;
      return { ...state, activeTheme: action.payload, colors };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface ThemeContextType {
  state: ThemeState;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(themeReducer, initialState);
  const systemColorScheme = useColorScheme();

  const loadThemeMode = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const themeMode: ThemeMode = (savedMode as ThemeMode) || 'auto';

      dispatch({ type: 'SET_THEME_MODE', payload: themeMode });

      let activeTheme: ActiveTheme;
      if (themeMode === 'auto') {
        activeTheme = systemColorScheme ?? 'light';
      } else {
        activeTheme = themeMode;
      }

      dispatch({ type: 'SET_ACTIVE_THEME', payload: activeTheme });
    } catch (error) {
      console.error('Error loading theme mode:', error);
      dispatch({ type: 'SET_THEME_MODE', payload: 'auto' });
      dispatch({
        type: 'SET_ACTIVE_THEME',
        payload: systemColorScheme ?? 'light',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [systemColorScheme]);

  useEffect(() => {
    if (state.mode === 'auto' && systemColorScheme) {
      dispatch({ type: 'SET_ACTIVE_THEME', payload: systemColorScheme });
    }
  }, [systemColorScheme, state.mode]);

  useEffect(() => {
    loadThemeMode();
  }, [loadThemeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      dispatch({ type: 'SET_THEME_MODE', payload: mode });

      let activeTheme: ActiveTheme;
      if (mode === 'auto') {
        activeTheme = systemColorScheme ?? 'light';
      } else {
        activeTheme = mode;
      }

      dispatch({ type: 'SET_ACTIVE_THEME', payload: activeTheme });
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode: ThemeMode = state.activeTheme === 'light' ? 'dark' : 'light';
    await setThemeMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ state, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeColors() {
  const { state } = useTheme();
  return state.colors;
}
