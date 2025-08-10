import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
}

export function useAsync<T>(
  asyncFunction?: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: options.initialData || null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      if (!asyncFunction) return;

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const data = await asyncFunction(...args);
        setState({ data, loading: false, error: null });
        options.onSuccess?.(data);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ data: null, loading: false, error: err });
        options.onError?.(err);
        throw err;
      }
    },
    [asyncFunction, options.onSuccess, options.onError]
  );

  const reset = useCallback(() => {
    setState({
      data: options.initialData || null,
      loading: false,
      error: null,
    });
  }, [options.initialData]);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for API calls
export function useApiCall<T>() {
  return useAsync<T>();
}

// Hook for handling form submissions
export function useFormSubmit<T, U>(
  submitFunction: (data: T) => Promise<U>,
  options: UseAsyncOptions<U> = {}
) {
  const { execute, loading, error, reset } = useAsync(submitFunction, options);

  const submit = useCallback(
    async (data: T) => {
      return execute(data);
    },
    [execute]
  );

  return {
    submit,
    isSubmitting: loading,
    error,
    reset,
  };
}