#!/usr/bin/env node

import { performanceOptimizer } from './PerformanceOptimizer';
import { memoryOptimizer } from './MemoryOptimizer';
import { storeIntegration } from './StoreIntegration';
import { performanceMonitor } from './PerformanceMonitor';

/**
 * Application optimization script
 * Run this to optimize the application for better performance
 */
async function optimizeApplication() {
  console.log('🚀 Starting application optimization...');
  console.log('=====================================');

  try {
    // Initialize performance systems
    console.log('📊 Initializing performance monitoring...');
    await storeIntegration.initialize();
    
    // Run startup optimization
    console.log('⚡ Running startup optimization...');
    await performanceOptimizer.optimizeStartup();
    
    // Force memory cleanup
    console.log('🧹 Running memory cleanup...');
    await memoryOptimizer.forceCleanup();
    
    // Generate initial performance report
    console.log('📈 Generating performance report...');
    const report = storeIntegration.generatePerformanceReport();
    const memoryReport = memoryOptimizer.generateMemoryReport();
    
    console.log('\n' + report);
    console.log('\n' + memoryReport);
    
    // Run performance benchmarks
    console.log('🏃 Running performance benchmarks...');
    await runPerformanceBenchmarks();
    
    console.log('\n✅ Application optimization completed!');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

/**
 * Run performance benchmarks
 */
async function runPerformanceBenchmarks(): Promise<void> {
  const benchmarks = [
    {
      name: 'Startup Time',
      test: async () => {
        const startTime = performance.now();
        await performanceOptimizer.optimizeStartup();
        return performance.now() - startTime;
      },
      target: 1000, // ms
      unit: 'ms'
    },
    {
      name: 'Memory Usage',
      test: async () => {
        const usage = memoryOptimizer.getMemoryUsageMB();
        return usage ? usage.heapUsed : 0;
      },
      target: 150, // MB
      unit: 'MB'
    },
    {
      name: 'Cache Performance',
      test: async () => {
        const startTime = performance.now();
        
        // Simulate cache operations
        for (let i = 0; i < 100; i++) {
          performanceOptimizer.cacheSearchResults(`test_${i}`, []);
          performanceOptimizer.getCachedSearchResults(`test_${i}`);
        }
        
        return performance.now() - startTime;
      },
      target: 50, // ms
      unit: 'ms'
    }
  ];

  console.log('\nBenchmark Results:');
  console.log('------------------');

  for (const benchmark of benchmarks) {
    try {
      const result = await benchmark.test();
      const status = result <= benchmark.target ? '✅' : '⚠️';
      
      console.log(`${status} ${benchmark.name}: ${result.toFixed(2)} ${benchmark.unit} (target: ${benchmark.target} ${benchmark.unit})`);
      
      // Record benchmark result
      performanceMonitor.recordMetric(`benchmark_${benchmark.name.toLowerCase().replace(/\s+/g, '_')}`, result, 'custom');
      
    } catch (error) {
      console.log(`❌ ${benchmark.name}: Failed - ${error}`);
    }
  }
}

/**
 * Main execution
 */
if (require.main === module) {
  optimizeApplication().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { optimizeApplication, runPerformanceBenchmarks };