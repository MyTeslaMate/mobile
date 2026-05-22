import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

export type DateRangeValue = {
  /** undefined start AND end means "all time" */
  start?: Date;
  end?: Date;
};

interface DateRangeContextValue {
  value: DateRangeValue;
  setValue: (next: DateRangeValue) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

/**
 * Shared filter state across Drives and Charges tabs. Lives only in memory —
 * intentionally NOT persisted: the user usually expects "all" when reopening
 * the app, not a stale 7d window.
 */
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<DateRangeValue>({});
  const ctx = useMemo(() => ({ value, setValue }), [value]);
  return <DateRangeContext.Provider value={ctx}>{children}</DateRangeContext.Provider>;
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return ctx;
}
