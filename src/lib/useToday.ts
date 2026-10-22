import { useEffect, useState } from 'react';
import { toISODate } from './dates';

/** "Today", recomputed when the app comes back into view on a new day. */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && toISODate(new Date()) !== toISODate(today))
        setToday(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [today]);
  return today;
}
