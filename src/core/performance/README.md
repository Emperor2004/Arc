# Performance Optimization System

This directory contains the comprehensive performance optimization system for Arc Browser, implementing advanced caching, lazy loading, memory management, and performance monitoring capabilities.

## Overview

The performance optimization system consists of several interconnected components designed to improve application responsiveness, reduce memory usage, and provide detailed performance insights.

## Components

### Core Performance Classes

#### 1. PerformanceOptimizer
**File:** `PerformanceOptimizer.ts`

Central manager that coordinates all performance optimizations.

**Features:**
- Integrates all performance components
- Manages recommendation and search result caching
- Provides startup optimization
- Generates comprehensive performance reports

**Usage:**
```typescript
import { performanceOptimizer } from './PerformanceOptimizer';

// Initialize optimizations
await performanceOptimizer.initialize();

// Cache recommendations
performanceOptimizer.cacheRecommendations('user123', recommendations, 300000);

// Get cached results
const cached = performanceOptimizer.getCachedRecommendations('user123');

// Generate report
const report = performanceOptimizer.generatePerformanceReport();
```

#### 2. MemoryOptimizer
**File:** `MemoryOptimizer.ts`

Advanced memory management with automatic cleanup strategies.

**Features:**
- Real-time memory monitoring
- Configurable cleanup strategies
- Managed cache creation with automatic cleanup
- Memory threshold alerts
- Garbage collection triggering

**Usage:**
```typescript
import { memoryOptimizer } from './MemoryOptimizer';

// Start monitoring
memoryOptimizer.startMonitoring(30000); // Check every 30 seconds

// Register cleanup strategy
memoryOptimizer.registerCleanupStrategy('my-cache', async () => {
  // Custom cleanup logic
});

// Create managed cache
const cache = memoryOptimizer.createManagedCache('user-data', 100);

// Force cleanup
await memoryOptimizer.forceCleanup();
```

#### 3. StoreIntegration
**File:** `StoreIntegration.ts`

Integration layer between performance optimizations and existing data stores.

**Features:**
- Enhanced bookmark operations with caching
- Lazy history loading
- Performance tracking for all operations
- Seamless integration with existing stores

**Usage:**
```typescript
import { storeIntegration } from './StoreIntegration';

// Initialize integration
await storeIntegration.initialize();

// Use optimized operations
const bookmark = await storeIntegration.addBookmarkOptimized(url, title, tags);
const results = await storeIntegration.searchBookmarksOptimized(query);
const history = await storeIntegration.getHistoryRangeOptimized(0, 50);
```

### Specialized Components

#### 4. LRUCache
**File:** `LRUCache.ts`

High-performance Least Recently Used cache implementation.

**Features:**
- O(1) get/set operations
- Automatic eviction of least recently used items
- Configurable capacity
- Iterator support

#### 5. LazyHistoryLoader
**File:** `LazyHistoryLoader.ts`

Paginated loading system for large history datasets.

**Features:**
- Page-based loading with configurable page size
- LRU cache for loaded pages
- Preloading capabilities
- Range-based data retrieval

#### 6. OptimizedBookmarkStore
**File:** `OptimizedBookmarkStore.ts`

Enhanced bookmark storage with caching and indexing.

**Features:**
- Fast search with LRU caching
- Tag-based filtering with caching
- Index-based lookups
- Batch operations

#### 7. PerformanceMonitor
**File:** `PerformanceMonitor.ts`

Comprehensive performance tracking and alerting system.

**Features:**
- Real-time metric collection
- Configurable thresholds with alerts
- Observer pattern for metric updates
- Automatic memory usage tracking
- Performance report generation

#### 8. WorkerPool
**File:** `WorkerPool.ts`

Web Worker pool for heavy computation tasks.

**Features:**
- Configurable worker pool size
- Task queuing and distribution
- Error handling and recovery
- Performance statistics

## Performance Dashboard

### PerformanceDashboard Component
**File:** `../components/PerformanceDashboard.tsx`

React component providing real-time performance monitoring UI.

**Features:**
- Live performance metrics display
- Memory usage visualization
- Cache statistics
- Control panel for optimization actions
- Performance report generation

**Usage:**
```tsx
import { PerformanceDashboard } from '../components/PerformanceDashboard';

function App() {
  return (
    <div>
      <PerformanceDashboard />
    </div>
  );
}
```

## Scripts and Tools

### Performance Scripts
Added to `package.json`:

```json
{
  "scripts": {
    "performance:profile": "npm run build:main && node --inspect dist/test/performance/runBenchmarks.js",
    "performance:memory": "npm run build:main && node --max-old-space-size=512 dist/test/performance/runBenchmarks.js",
    "performance:optimize": "npm run build:main && node dist/core/performance/optimizeApp.js"
  }
}
```

### Optimization Script
**File:** `optimizeApp.ts`

Command-line tool for application optimization.

**Features:**
- Automated performance optimization
- Benchmark execution
- Performance report generation
- Memory cleanup

**Usage:**
```bash
npm run performance:optimize
```

## Integration Guide

### 1. Basic Setup

```typescript
import { performanceOptimizer } from './core/performance/PerformanceOptimizer';
import { storeIntegration } from './core/performance/StoreIntegration';

// Initialize performance system
async function initializeApp() {
  await storeIntegration.initialize();
  await performanceOptimizer.optimizeStartup();
}
```

### 2. Using Optimized Operations

Replace existing store operations with optimized versions:

```typescript
// Before
const bookmarks = await bookmarkStore.searchBookmarks(query);

// After
const bookmarks = await storeIntegration.searchBookmarksOptimized(query);
```

### 3. Memory Management

```typescript
import { memoryOptimizer } from './core/performance/MemoryOptimizer';

// Start memory monitoring
memoryOptimizer.startMonitoring();

// Register cleanup for your components
memoryOptimizer.registerCleanupStrategy('my-component', async () => {
  // Cleanup logic
});
```

### 4. Performance Monitoring

```typescript
import { performanceMonitor } from './core/performance/PerformanceMonitor';

// Track custom operations
await performanceMonitor.timeFunction('my-operation', async () => {
  // Your operation
});

// Subscribe to metrics
const unsubscribe = performanceMonitor.subscribe('memory_heap_used', (metric) => {
  if (metric.value > 200) {
    console.warn('High memory usage detected');
  }
});
```

## Performance Benchmarks

The system includes comprehensive benchmarks that verify:

- **Startup Time**: < 2 seconds with large datasets
- **Recommendation Generation**: < 500ms
- **Bookmark Search**: < 100ms
- **History Search**: < 200ms
- **Memory Usage**: < 200MB under normal operation

Run benchmarks with:
```bash
npm run test:performance
npm run benchmark
```

## Configuration

### Memory Thresholds

```typescript
memoryOptimizer.setMemoryThresholds({
  warning: 150,  // MB
  critical: 300, // MB
  cleanup: 200   // MB
});
```

### Performance Thresholds

```typescript
performanceMonitor.setThreshold('search_time', 100, 500); // warning, critical (ms)
```

### Cache Sizes

```typescript
// Adjust cache sizes based on your needs
const optimizer = new PerformanceOptimizer();
// Uses managed caches with automatic cleanup
```

## Best Practices

1. **Initialize Early**: Call `storeIntegration.initialize()` during app startup
2. **Use Optimized Operations**: Replace direct store calls with integration layer methods
3. **Monitor Memory**: Enable memory monitoring in production
4. **Regular Cleanup**: Register cleanup strategies for your components
5. **Performance Testing**: Run benchmarks regularly to catch regressions

## Troubleshooting

### High Memory Usage
- Check memory report: `memoryOptimizer.generateMemoryReport()`
- Force cleanup: `await memoryOptimizer.forceCleanup()`
- Review cleanup strategies

### Slow Performance
- Check performance report: `performanceOptimizer.generatePerformanceReport()`
- Clear caches: `performanceOptimizer.clearAllCaches()`
- Review cache hit rates

### Cache Issues
- Monitor cache statistics in performance dashboard
- Adjust cache sizes if needed
- Check for cache invalidation logic

## Testing

The performance system includes comprehensive tests:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Cross-component functionality
- **Performance Tests**: Benchmark validation
- **Property-Based Tests**: Edge case validation

Run tests with:
```bash
npm run test src/test/performance/
```

## Future Enhancements

Potential improvements for future versions:

1. **Predictive Caching**: Machine learning-based cache preloading
2. **Adaptive Thresholds**: Dynamic threshold adjustment based on usage patterns
3. **Distributed Caching**: Multi-process cache sharing
4. **Advanced Analytics**: Detailed performance analytics and insights
5. **Real-time Optimization**: Automatic performance tuning based on usage patterns