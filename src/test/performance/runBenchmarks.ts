#!/usr/bin/env node

/**
 * Performance Benchmark CLI Tool
 * 
 * This script runs performance benchmarks for the Arc Browser application
 * and generates detailed reports. It can be run independently of the test suite.
 * 
 * Usage:
 *   npm run benchmark
 *   node dist/test/performance/runBenchmarks.js
 *   ts-node src/test/performance/runBenchmarks.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { AppPerformanceProfiler, PerformanceBenchmark } from './appPerformanceProfiler';
import { addBookmark, clearBookmarks } from '../../core/bookmarkStore';
import { addHistoryEntry, clearHistory } from '../../core/historyStore';

interface BenchmarkReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    totalMemory: number;
  };
  benchmark: PerformanceBenchmark;
  detailedMetrics: any[];
  memoryProfile: any[];
  summary: string;
  recommendations: string[];
}

class BenchmarkRunner {
  private profiler: AppPerformanceProfiler;
  private outputDir: string;

  constructor() {
    this.profiler = new AppPerformanceProfiler();
    this.outputDir = path.join(process.cwd(), 'performance-reports');
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Set up realistic test data for benchmarking
   */
  private async setupTestData(): Promise<void> {
    console.log('📝 Setting up test data...');
    
    // Clear existing data
    clearBookmarks();
    clearHistory();

    // Add realistic bookmarks
    const domains = [
      'github.com', 'stackoverflow.com', 'google.com', 'microsoft.com',
      'mozilla.org', 'w3.org', 'npmjs.com', 'typescript.org',
      'reactjs.org', 'nodejs.org', 'developer.mozilla.org', 'docs.microsoft.com',
      'medium.com', 'dev.to', 'hackernews.com', 'reddit.com'
    ];

    const bookmarkTitles = [
      'Documentation', 'Tutorial', 'Guide', 'Reference', 'API',
      'Examples', 'Getting Started', 'Advanced Topics', 'Best Practices',
      'Troubleshooting', 'FAQ', 'Community', 'Blog Post', 'News'
    ];

    // Add 1000 bookmarks
    for (let i = 0; i < 1000; i++) {
      const domain = domains[i % domains.length];
      const title = bookmarkTitles[i % bookmarkTitles.length];
      const url = `https://${domain}/page-${i}`;
      const bookmarkTitle = `${title} - ${domain}`;
      const tags = [`tag${i % 10}`, `category${i % 5}`];
      
      addBookmark(url, bookmarkTitle, tags);
    }

    // Add 10,000 history entries
    const historyTitles = [
      'React Documentation', 'TypeScript Handbook', 'Node.js Guide',
      'Performance Optimization', 'Web Development', 'JavaScript Tutorial',
      'CSS Grid Layout', 'API Design', 'Database Management', 'Security Best Practices'
    ];

    for (let i = 0; i < 10000; i++) {
      const domain = domains[i % domains.length];
      const title = historyTitles[i % historyTitles.length];
      const url = `https://${domain}/article-${i}`;
      const historyTitle = `${title} - ${domain}`;
      
      addHistoryEntry(url, historyTitle);
    }

    console.log('✅ Test data setup complete (1000 bookmarks, 10000 history entries)');
  }

  /**
   * Generate performance recommendations based on benchmark results
   */
  private generateRecommendations(benchmark: PerformanceBenchmark): string[] {
    const recommendations: string[] = [];
    const requirements = {
      appStartup: 2000,
      recommendationGeneration: 500,
      bookmarkSearch: 100,
      historySearch: 200,
      memoryUsage: 200
    };

    if (benchmark.appStartup > requirements.appStartup) {
      recommendations.push(
        `🚀 App Startup (${benchmark.appStartup.toFixed(2)}ms > ${requirements.appStartup}ms): ` +
        'Consider lazy loading non-critical components, optimizing database queries, or implementing progressive loading.'
      );
    }

    if (benchmark.recommendationGeneration > requirements.recommendationGeneration) {
      recommendations.push(
        `🎯 Recommendation Generation (${benchmark.recommendationGeneration.toFixed(2)}ms > ${requirements.recommendationGeneration}ms): ` +
        'Consider implementing caching, reducing history analysis scope, or using worker threads for computation.'
      );
    }

    if (benchmark.bookmarkSearch > requirements.bookmarkSearch) {
      recommendations.push(
        `🔍 Bookmark Search (${benchmark.bookmarkSearch.toFixed(2)}ms > ${requirements.bookmarkSearch}ms): ` +
        'Consider implementing search indexing, optimizing search algorithms, or using database full-text search.'
      );
    }

    if (benchmark.historySearch > requirements.historySearch) {
      recommendations.push(
        `📚 History Search (${benchmark.historySearch.toFixed(2)}ms > ${requirements.historySearch}ms): ` +
        'Consider implementing better indexing, limiting search scope, or using more efficient search algorithms.'
      );
    }

    if (benchmark.memoryUsage > requirements.memoryUsage) {
      recommendations.push(
        `💾 Memory Usage (${benchmark.memoryUsage.toFixed(2)}MB > ${requirements.memoryUsage}MB): ` +
        'Consider implementing LRU caches, reducing data retention, or optimizing data structures.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 All performance benchmarks are within acceptable limits! Great job!');
    }

    return recommendations;
  }

  /**
   * Generate environment information
   */
  private getEnvironmentInfo(): BenchmarkReport['environment'] {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      totalMemory: Math.round(require('os').totalmem() / 1024 / 1024) // MB
    };
  }

  /**
   * Run the complete benchmark suite
   */
  async runBenchmarks(): Promise<BenchmarkReport> {
    console.log('🏁 Starting Arc Browser Performance Benchmark Suite');
    console.log('==================================================');
    
    const startTime = Date.now();
    
    // Setup test data
    await this.setupTestData();
    
    // Run comprehensive benchmark
    const result = await this.profiler.runComprehensiveBenchmark();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(result.benchmark);
    
    // Create report
    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      benchmark: result.benchmark,
      detailedMetrics: result.detailedMetrics,
      memoryProfile: result.memoryProfile,
      summary: result.summary,
      recommendations
    };
    
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total benchmark time: ${totalTime}ms`);
    
    return report;
  }

  /**
   * Save benchmark report to file
   */
  private saveReport(report: BenchmarkReport): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-report-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    return filepath;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: BenchmarkReport): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-report-${timestamp}.html`;
    const filepath = path.join(this.outputDir, filename);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arc Browser Performance Report - ${report.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .benchmark { background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .metric { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f3f4; }
        .metric:last-child { border-bottom: none; }
        .metric-name { font-weight: 500; }
        .metric-value { font-family: 'SF Mono', Monaco, monospace; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; }
        .recommendation { margin-bottom: 10px; }
        .environment { background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .environment-item { display: inline-block; margin-right: 20px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Arc Browser Performance Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="environment">
        <h2>🖥️ Environment</h2>
        <div class="environment-item"><strong>Node.js:</strong> ${report.environment.nodeVersion}</div>
        <div class="environment-item"><strong>Platform:</strong> ${report.environment.platform}</div>
        <div class="environment-item"><strong>Architecture:</strong> ${report.environment.arch}</div>
        <div class="environment-item"><strong>Total Memory:</strong> ${report.environment.totalMemory}MB</div>
    </div>

    <div class="benchmark">
        <h2>📊 Performance Benchmarks</h2>
        <div class="metric">
            <span class="metric-name">🚀 App Startup</span>
            <span class="metric-value ${report.benchmark.appStartup <= 2000 ? 'pass' : 'fail'}">
                ${report.benchmark.appStartup.toFixed(2)}ms ${report.benchmark.appStartup <= 2000 ? '✅' : '❌'}
            </span>
        </div>
        <div class="metric">
            <span class="metric-name">🎯 Recommendation Generation</span>
            <span class="metric-value ${report.benchmark.recommendationGeneration <= 500 ? 'pass' : 'fail'}">
                ${report.benchmark.recommendationGeneration.toFixed(2)}ms ${report.benchmark.recommendationGeneration <= 500 ? '✅' : '❌'}
            </span>
        </div>
        <div class="metric">
            <span class="metric-name">🔍 Bookmark Search</span>
            <span class="metric-value ${report.benchmark.bookmarkSearch <= 100 ? 'pass' : 'fail'}">
                ${report.benchmark.bookmarkSearch.toFixed(2)}ms ${report.benchmark.bookmarkSearch <= 100 ? '✅' : '❌'}
            </span>
        </div>
        <div class="metric">
            <span class="metric-name">📚 History Search</span>
            <span class="metric-value ${report.benchmark.historySearch <= 200 ? 'pass' : 'fail'}">
                ${report.benchmark.historySearch.toFixed(2)}ms ${report.benchmark.historySearch <= 200 ? '✅' : '❌'}
            </span>
        </div>
        <div class="metric">
            <span class="metric-name">💾 Memory Usage</span>
            <span class="metric-value ${report.benchmark.memoryUsage <= 200 ? 'pass' : 'fail'}">
                ${report.benchmark.memoryUsage.toFixed(2)}MB ${report.benchmark.memoryUsage <= 200 ? '✅' : '❌'}
            </span>
        </div>
    </div>

    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        ${report.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
    </div>

    <div class="benchmark">
        <h2>📈 Detailed Metrics</h2>
        <p>Total operations measured: ${report.detailedMetrics.length}</p>
        <p>Memory snapshots taken: ${report.memoryProfile.length}</p>
        <details>
            <summary>View Raw Data</summary>
            <pre>${JSON.stringify({ benchmark: report.benchmark, detailedMetrics: report.detailedMetrics.slice(0, 10) }, null, 2)}</pre>
        </details>
    </div>
</body>
</html>`;

    fs.writeFileSync(filepath, html);
    return filepath;
  }

  /**
   * Run benchmarks and generate reports
   */
  async run(): Promise<void> {
    try {
      const report = await this.runBenchmarks();
      
      // Save JSON report
      const jsonPath = this.saveReport(report);
      console.log(`📄 JSON report saved: ${jsonPath}`);
      
      // Generate HTML report
      const htmlPath = this.generateHtmlReport(report);
      console.log(`🌐 HTML report saved: ${htmlPath}`);
      
      // Print summary to console
      console.log('\n' + report.summary);
      
      // Print recommendations
      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach(rec => console.log(`   ${rec}`));
      }
      
      console.log('\n🎉 Benchmark complete!');
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new BenchmarkRunner();
  runner.run().catch(console.error);
}

export { BenchmarkRunner };