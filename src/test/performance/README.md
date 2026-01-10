# Arc Browser Performance Profiling

This directory contains comprehensive performance profiling tools for the Arc Browser application, implementing the requirements from **Requirement 10.5: Performance Optimization**.

## 📊 Performance Requirements

The application must meet these performance benchmarks:

- **App Startup**: < 2000ms with 10,000+ history entries
- **Recommendation Generation**: < 500ms with large history
- **Bookmark Search**: < 100ms with 1,000+ bookmarks  
- **History Search**: < 200ms with large datasets
- **Memory Usage**: < 200MB during active use, < 50MB when idle

## 🛠️ Tools Overview

### 1. AppPerformanceProfiler (`appPerformanceProfiler.ts`)

The main profiling engine that measures all performance metrics:

```typescript
import { AppPerformanceProfiler } from './appPerformanceProfiler';

const profiler = new AppPerformanceProfiler();
const result = await profiler.runComprehensiveBenchmark();
console.log(result.summary);
```

**Features:**
- App startup time measurement
- Recommendation generation profiling
- Search operation benchmarking
- Memory usage monitoring
- Detailed metrics collection
- Performance trend analysis

### 2. Performance Test Suite (`performanceBenchmarks.test.ts`)

Comprehensive test suite that validates all performance requirements:

```bash
# Run performance tests
npm run test:performance

# Run with coverage
npm run test:coverage
```

**Test Categories:**
- App startup performance validation
- Recommendation generation benchmarks
- Bookmark search performance tests
- History search performance tests
- Memory usage validation
- Comprehensive benchmark validation

### 3. Benchmark CLI Tool (`runBenchmarks.ts`)

Standalone CLI tool for running benchmarks outside of tests:

```bash
# Run benchmarks (requires build)
npm run benchmark

# Run in development mode
npm run benchmark:dev
```

**Outputs:**
- Console performance summary
- JSON report with detailed metrics
- HTML report with visualizations
- Performance recommendations

### 4. Memory Profiler (`memoryProfiler.ts`)

Real-time memory monitoring and leak detection:

```typescript
import { memoryProfiler, monitorMemoryDuring } from './memoryProfiler';

// Monitor memory during operation
const { result, report } = await monitorMemoryDuring(async () => {
  // Your operation here
  return await someExpensiveOperation();
});

console.log(report);
```

**Features:**
- Real-time memory monitoring
- Memory leak detection
- Memory usage statistics
- Trend analysis
- Garbage collection utilities

### 5. History Search Performance (`historySearchPerformance.test.ts`)

Specialized performance tests for history search functionality:

- Large dataset handling (10,000+ entries)
- Complex filter performance
- Concurrent search testing
- Edge case performance validation

## 🚀 Quick Start

### Running Performance Tests

```bash
# Install dependencies
npm install

# Run all performance tests
npm run test:performance

# Run comprehensive benchmark
npm run benchmark:dev
```

### Using in Development

```typescript
// Quick benchmark
import { quickBenchmark } from './test/performance/appPerformanceProfiler';

const benchmark = await quickBenchmark();
console.log(`Startup: ${benchmark.appStartup}ms`);
console.log(`Recommendations: ${benchmark.recommendationGeneration}ms`);
```

### Memory Monitoring

```typescript
// Start monitoring
import { memoryProfiler } from './test/performance/memoryProfiler';

memoryProfiler.startMonitoring(1000); // Every 1 second

// ... run your application ...

const snapshots = memoryProfiler.stopMonitoring();
console.log(memoryProfiler.generateReport());
```

## 📈 Understanding Results

### Performance Metrics

Each operation is measured with:
- **Duration**: Time taken in milliseconds
- **Memory Before/After**: Heap usage before and after operation
- **Memory Delta**: Change in memory usage
- **Success**: Whether operation completed successfully
- **Data Size**: Amount of data processed (when applicable)

### Benchmark Status

- ✅ **PASSED**: Metric meets performance requirement
- ❌ **FAILED**: Metric exceeds performance requirement

### Memory Analysis

- **Trend**: Overall memory usage direction (increasing/decreasing/stable)
- **Leak Detection**: Identifies sustained memory growth patterns
- **Severity**: Classifies leaks as low/medium/high priority

## 🔧 Configuration

### Customizing Benchmarks

```typescript
const profiler = new AppPerformanceProfiler();

// Custom recommendation profiling
const metrics = await profiler.profileRecommendationGeneration(20); // 20 iterations

// Custom search queries
const bookmarkMetrics = await profiler.profileBookmarkSearch([
  'custom', 'search', 'terms'
], 5); // 5 iterations each
```

### Memory Profiler Settings

```typescript
const profiler = new MemoryProfiler(2); // 2MB/min leak threshold

profiler.startMonitoring(500); // 500ms intervals
```

## 📊 Report Formats

### Console Output
Real-time performance feedback with emoji indicators and color coding.

### JSON Reports
Detailed machine-readable data for analysis and CI/CD integration:

```json
{
  "timestamp": "2024-01-11T...",
  "benchmark": {
    "appStartup": 1250.45,
    "recommendationGeneration": 234.12,
    "bookmarkSearch": 45.67,
    "historySearch": 123.89,
    "memoryUsage": 156.78
  },
  "detailedMetrics": [...],
  "recommendations": [...]
}
```

### HTML Reports
Visual reports with charts and detailed breakdowns, saved to `performance-reports/` directory.

## 🎯 Performance Optimization Tips

Based on benchmark results, the system provides automatic recommendations:

### App Startup Optimization
- Lazy load non-critical components
- Optimize database queries
- Implement progressive loading
- Cache frequently accessed data

### Recommendation Generation
- Implement result caching (5-minute TTL)
- Use worker threads for heavy computation
- Limit history analysis scope
- Optimize scoring algorithms

### Search Performance
- Implement search indexing
- Use database full-text search
- Optimize query algorithms
- Cache frequent searches

### Memory Management
- Implement LRU caches
- Reduce data retention periods
- Optimize data structures
- Regular garbage collection

## 🧪 Testing Strategy

### Unit Tests
- Individual component performance
- Edge case handling
- Error condition performance

### Integration Tests
- End-to-end workflow performance
- Component interaction benchmarks
- Real-world usage simulation

### Property-Based Tests
- Performance consistency across random inputs
- Scalability validation
- Stress testing with generated data

## 📝 Adding New Benchmarks

To add a new performance benchmark:

1. **Add to AppPerformanceProfiler**:
```typescript
async profileNewFeature(): Promise<PerformanceMetrics[]> {
  // Implementation
}
```

2. **Add to Test Suite**:
```typescript
it('should perform new feature within limits', async () => {
  const metrics = await profiler.profileNewFeature();
  expect(metrics[0].duration).toBeLessThan(TARGET_TIME);
});
```

3. **Update Requirements**:
Add new benchmark to `PerformanceBenchmark` interface and validation logic.

## 🔍 Troubleshooting

### Common Issues

**High Memory Usage**:
- Check for memory leaks using `memoryProfiler`
- Force garbage collection with `profiler.forceGarbageCollection()`
- Review data retention policies

**Slow Performance**:
- Run detailed profiling to identify bottlenecks
- Check database query performance
- Review algorithm complexity

**Inconsistent Results**:
- Ensure consistent test data
- Account for system load variations
- Run multiple iterations for averaging

### Debug Mode

Enable verbose logging:
```typescript
process.env.DEBUG_PERFORMANCE = 'true';
```

## 📚 References

- [Requirement 10.5: Performance Optimization](../../../.kiro/specs/arc-browser-phase-10/requirements.md)
- [Performance Design Document](../../../.kiro/specs/arc-browser-phase-10/design.md)
- [Node.js Performance Hooks](https://nodejs.org/api/perf_hooks.html)
- [Memory Usage API](https://nodejs.org/api/process.html#process_process_memoryusage)

## 🤝 Contributing

When adding new performance tests:

1. Follow existing patterns and naming conventions
2. Include both success and failure scenarios
3. Add appropriate timeouts for long-running tests
4. Document expected performance characteristics
5. Update this README with new features

---

**Note**: Performance benchmarks may vary based on system specifications, load, and data size. Results should be interpreted relative to the target environment and requirements.