/**
 * Performance Monitoring Utilities
 *
 * Features:
 * - Component render time tracking
 * - User timing API integration
 * - Performance metrics collection
 * - Bundle size monitoring helpers
 * - Lazy loading utilities
 *
 * Phase 3 Week 7 implementation
 */

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Measure execution time of a function
 *
 * @param name - Measurement name
 * @param fn - Function to measure
 * @returns Function result
 *
 * @example
 * const result = await measurePerformance('api-call', () => fetchData());
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      reportPerformanceMetric(name, duration);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Create performance marks for User Timing API
 *
 * @param name - Mark name
 *
 * @example
 * mark('component-mount-start');
 * // ... component logic
 * mark('component-mount-end');
 * const duration = measure('component-mount', 'component-mount-start', 'component-mount-end');
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure duration between two marks
 *
 * @param name - Measurement name
 * @param startMark - Start mark name
 * @param endMark - End mark name
 * @returns Duration in milliseconds, or null if marks don't exist
 */
export function measure(name: string, startMark: string, endMark: string): number | null {
  if (typeof performance === 'undefined' || !performance.measure) {
    return null;
  }

  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];

    if (entry) {
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${entry.duration.toFixed(2)}ms`);
      }

      return entry.duration;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to measure ${name}:`, error);
    return null;
  }
}

// ============================================================================
// Core Web Vitals
// ============================================================================

export interface WebVitals {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * Collect Core Web Vitals metrics
 *
 * @param callback - Called with metrics as they become available
 *
 * @example
 * collectWebVitals((metrics) => {
 *   console.log('Web Vitals:', metrics);
 * });
 */
export function collectWebVitals(callback: (metrics: WebVitals) => void): void {
  if (typeof window === 'undefined') return;

  const metrics: WebVitals = {};

  // FCP - First Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
            callback({ ...metrics });
            fcpObserver.disconnect();
          }
        }
      });

      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      // PerformanceObserver not fully supported
    }

    // LCP - Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
        callback({ ...metrics });
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Not supported
    }

    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-input') {
            metrics.fid = (entry as any).processingStart - entry.startTime;
            callback({ ...metrics });
            fidObserver.disconnect();
          }
        }
      });

      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // Not supported
    }

    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            metrics.cls = clsValue;
            callback({ ...metrics });
          }
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Not supported
    }
  }

  // TTFB - Time to First Byte
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    window.addEventListener('load', () => {
      metrics.ttfb = timing.responseStart - timing.requestStart;
      callback({ ...metrics });
    });
  }
}

/**
 * Report performance metric to analytics
 */
function reportPerformanceMetric(name: string, value: number): void {
  // In production, send to analytics service
  // Example: Google Analytics, Segment, custom endpoint

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'timing_complete', {
      name,
      value: Math.round(value),
      event_category: 'Performance',
    });
  }

  // Or custom endpoint
  // fetch('/api/metrics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ name, value, timestamp: Date.now() })
  // });
}

// ============================================================================
// Bundle Size Monitoring
// ============================================================================

/**
 * Get estimated bundle size from loaded scripts
 *
 * @returns Total estimated bundle size in bytes
 */
export function getEstimatedBundleSize(): number {
  if (typeof document === 'undefined') return 0;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  let totalSize = 0;

  scripts.forEach((script) => {
    const src = script.getAttribute('src');
    if (src && window.performance) {
      const resource = performance.getEntriesByName(src, 'resource')[0] as PerformanceResourceTiming;
      if (resource && resource.transferSize) {
        totalSize += resource.transferSize;
      }
    }
  });

  return totalSize;
}

/**
 * Log bundle size information
 */
export function logBundleInfo(): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  const size = getEstimatedBundleSize();
  const sizeKB = (size / 1024).toFixed(2);
  const sizeMB = (size / 1024 / 1024).toFixed(2);

  console.group('📦 Bundle Size');
  console.log(`Total: ${sizeKB} KB (${sizeMB} MB)`);

  // Check if exceeds budget
  const budgetKB = 500; // 500KB recommended
  if (size / 1024 > budgetKB) {
    console.warn(`⚠️ Bundle exceeds ${budgetKB}KB budget`);
  } else {
    console.log(`✅ Within ${budgetKB}KB budget`);
  }

  console.groupEnd();
}

// ============================================================================
// Resource Loading Utilities
// ============================================================================

/**
 * Preload critical resources
 *
 * @param url - Resource URL
 * @param as - Resource type
 *
 * @example
 * preloadResource('/fonts/inter.woff2', 'font');
 */
export function preloadResource(url: string, as: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;

  if (as === 'font') {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
}

/**
 * Lazy load image with Intersection Observer
 *
 * @param img - Image element
 * @param src - Image source URL
 *
 * @example
 * const imgRef = useRef<HTMLImageElement>(null);
 * useEffect(() => {
 *   if (imgRef.current) {
 *     lazyLoadImage(imgRef.current, '/image.jpg');
 *   }
 * }, []);
 */
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = src;
  }
}

// ============================================================================
// React Component Performance
// ============================================================================

/**
 * Track component render count (development only)
 *
 * @param componentName - Name of component
 *
 * @example
 * function MyComponent() {
 *   useRenderCount('MyComponent');
 *   return <div>...</div>;
 * }
 */
export function useRenderCount(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  const renderCount = React.useRef(0);

  React.useEffect(() => {
    renderCount.current += 1;
    console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
  });
}

/**
 * Warn about expensive re-renders
 *
 * @param componentName - Name of component
 * @param threshold - Render time threshold in ms
 *
 * @example
 * function MyComponent() {
 *   useRenderPerformance('MyComponent', 16); // Warn if > 16ms
 *   return <div>...</div>;
 * }
 */
export function useRenderPerformance(componentName: string, threshold: number = 16): void {
  if (process.env.NODE_ENV !== 'development') return;

  const startTime = React.useRef<number>(0);

  startTime.current = performance.now();

  React.useEffect(() => {
    const renderTime = performance.now() - startTime.current;
    if (renderTime > threshold) {
      console.warn(
        `⚠️ ${componentName} render took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }
  });
}

// Need to import React for hooks
import * as React from 'react';
