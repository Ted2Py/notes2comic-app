"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing callbacks
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * Custom hook for throttling callbacks
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        callback(...args);
        lastRunRef.current = now;
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Lazy load images with intersection observer
 */
export function useLazyImage(src: string, threshold: number = 0.1) {
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, threshold]);

  return { imgRef, src: imageSrc };
}

/**
 * Memoize expensive computations
 * Note: Just use React's useMemo directly instead of this wrapper
 * Example: useMemo(() => expensiveCalculation(a, b), [a, b])
 */
export { useMemo as useMemoized } from "react";

/**
 * Cache for expensive operations
 */
export class SimpleCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL;
  }

  set(key: K, value: V, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Request animation frame throttle
 */
export function useRafThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const rafIdRef = useRef<number | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        callback(...args);
        rafIdRef.current = undefined;
      });
    },
    [callback]
  ) as T;
}

/**
 * Image preloader
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  const promises = urls.map(
    (url) =>
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      })
  );

  return Promise.all(promises);
}

/**
 * Detect if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}
