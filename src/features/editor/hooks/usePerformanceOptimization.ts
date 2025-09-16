import { useCallback, useRef, useEffect } from 'react';

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const metricsRef = useRef({
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    lastUpdate: performance.now(),
    frameCount: 0
  });

  const updateMetrics = useCallback(() => {
    const now = performance.now();
    const metrics = metricsRef.current;
    
    metrics.frameCount++;
    
    // Update FPS every second
    if (now - metrics.lastUpdate >= 1000) {
      metrics.fps = Math.round((metrics.frameCount * 1000) / (now - metrics.lastUpdate));
      metrics.frameCount = 0;
      metrics.lastUpdate = now;
      
      // Memory usage (if available)
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        metrics.memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
      }
      
      // Log performance metrics in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Performance: ${metrics.fps} FPS, ${metrics.memoryUsage}MB RAM`);
      }
    }
  }, []);

  return { updateMetrics, metrics: metricsRef.current };
};

// Debounce hook
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Throttle hook
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const lastCallRef = useRef(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    }
  }, [callback, delay]);
};

// Animation frame hook for smooth updates
export const useAnimationFrame = (callback: () => void, enabled = true) => {
  const requestRef = useRef<number>();
  
  const animate = useCallback(() => {
    callback();
    if (enabled) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [callback, enabled]);
  
  useEffect(() => {
    if (enabled) {
      requestRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, enabled]);
};

// Memory management hook
export const useMemoryManagement = () => {
  const objectPoolRef = useRef<Map<string, any[]>>(new Map());
  
  const getFromPool = useCallback((type: string) => {
    const pool = objectPoolRef.current.get(type) || [];
    return pool.pop() || null;
  }, []);
  
  const returnToPool = useCallback((type: string, object: any) => {
    if (!objectPoolRef.current.has(type)) {
      objectPoolRef.current.set(type, []);
    }
    
    const pool = objectPoolRef.current.get(type)!;
    if (pool.length < 10) { // Limit pool size
      pool.push(object);
    }
  }, []);
  
  const clearPools = useCallback(() => {
    objectPoolRef.current.clear();
  }, []);
  
  return { getFromPool, returnToPool, clearPools };
};

// Canvas optimization utilities
export const CanvasOptimizer = {
  // Optimize canvas settings for performance
  optimizeCanvas: (canvas: any) => {
    canvas.set({
      // Rendering optimizations
      renderOnAddRemove: false,
      skipTargetFind: false,
      perPixelTargetFind: true,
      enableRetinaScaling: true,
      imageSmoothingEnabled: true,
      
      // Object caching
      objectCaching: true,
      statefullCache: true,
      
      // Selection optimizations
      preserveObjectStacking: true,
      
      // Performance flags
      allowTouchScrolling: false,
      moveCursor: 'move',
      hoverCursor: 'move',
    });
    
    // Enable dirty flag optimization
    canvas.renderOnAddRemove = false;
    
    return canvas;
  },
  
  // Batch multiple operations
  batchOperations: (canvas: any, operations: (() => void)[]) => {
    canvas.renderOnAddRemove = false;
    
    operations.forEach(op => op());
    
    canvas.renderOnAddRemove = true;
    canvas.renderAll();
  },
  
  // Optimize object for better performance
  optimizeObject: (obj: any) => {
    obj.set({
      // Caching
      objectCaching: true,
      statefullCache: true,
      
      // Smooth rendering
      strokeUniform: true,
      noScaleCache: false,
    });
    
    return obj;
  }
};