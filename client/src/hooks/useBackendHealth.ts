import { useState, useEffect, useCallback } from 'react';
import { healthCheck } from '../services/api';

interface UseBackendHealthReturn {
  isHealthy: boolean;
  isChecking: boolean;
  error: string | null;
  retryHealthCheck: () => void;
}

export const useBackendHealth = (
  maxRetries: number = 30,
  retryInterval: number = 1000
): UseBackendHealthReturn => {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const performHealthCheck = useCallback(async () => {
    try {
      const healthy = await healthCheck();
      if (healthy) {
        setIsHealthy(true);
        setIsChecking(false);
        setError(null);
        console.log('✅ Backend health check passed');
        return true;
      }
      return false;
    } catch (err) {
      console.log('❌ Backend health check error:', err);
      return false;
    }
  }, []);

  const retryHealthCheck = useCallback(() => {
    setIsHealthy(false);
    setIsChecking(true);
    setError(null);
    setRetryCount(0);
  }, []);

  useEffect(() => {
    if (isHealthy || !isChecking) {
      return;
    }

    const checkHealth = async () => {
      console.log(`🔍 Backend health check attempt ${retryCount + 1}/${maxRetries}`);
      
      const healthy = await performHealthCheck();
      
      if (!healthy) {
        if (retryCount >= maxRetries - 1) {
          setIsChecking(false);
          setError('Backend server is not responding. Please check if the server is running.');
          console.error('❌ Backend health check failed after maximum retries');
        } else {
          setRetryCount(prev => prev + 1);
          setTimeout(checkHealth, retryInterval);
        }
      }
    };

    // Start the first check immediately
    checkHealth();
  }, [isHealthy, isChecking, retryCount, maxRetries, retryInterval, performHealthCheck]);

  return {
    isHealthy,
    isChecking,
    error,
    retryHealthCheck
  };
};
