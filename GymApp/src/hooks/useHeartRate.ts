import { useState, useEffect, useCallback } from 'react';
import { HeartRateService } from '../services/heartRateService';
import { HeartRateState } from '../types';

export function useHeartRate(): HeartRateState & {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
} {
  const [state, setState] = useState<HeartRateState>(HeartRateService.getState());

  useEffect(() => {
    const unsubscribe = HeartRateService.subscribe(setState);
    return unsubscribe;
  }, []);

  const connect = useCallback(() => HeartRateService.connect(), []);
  const disconnect = useCallback(() => HeartRateService.disconnect(), []);

  return { ...state, connect, disconnect };
}
