import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useQueryParam(key: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const value = searchParams.get(key);
  
  const setValue = useCallback((newValue: string | null) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (newValue === null) {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, newValue);
    }
    setSearchParams(newSearchParams);
  }, [key, searchParams, setSearchParams]);
  
  return [value, setValue] as const;
}