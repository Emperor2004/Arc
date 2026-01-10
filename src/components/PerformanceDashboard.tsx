import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../core/performance/PerformanceMonitor';
import { performanceOptimizer } from '../core/performance/PerformanceOptimizer';
import { memoryOptimizer } from '../core/performance/MemoryOptimizer';
import { storeIntegration } from '../core/performance/StoreIntegration';

interface PerformanceStats {
  bookmarkCache: any;
  historyCache: any;
  recommendationCache: { size: number; capacity: number };
  searchCache: { size: number; capacity: number };
  memoryUsage?: NodeJS.MemoryUsage;
}

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
}

/**
 * Performance monitoring dashboard component
 */
export const PerformanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      const updateStats = () => {
        const performanceStats = performanceOptimizer.getPerformanceStats();
        setStats(performanceStats);

        const memUsage = memoryOptimizer.getMemoryUsageMB();
        setMemoryUsage(memUsage);
      };

      updateStats(); // Initial update
      interval = setInterval(updateStats, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, refreshInterval]);

  const handleStartMonitoring = () => {
    performanceMonitor.startMonitoring(refreshInterval);
    memoryOptimizer.startMonitoring(30000); // Check memory every 30 seconds
    setIsMonitoring(true);
  };

  const handleStopMonitoring = () => {
    performanceMonitor.stopMonitoring();
    memoryOptimizer.stopMonitoring();
    setIsMonitoring(false);
  };

  const handleClearCaches = () => {
    storeIntegration.clearCaches();
    // Refresh stats after clearing
    setTimeout(() => {
      const performanceStats = performanceOptimizer.getPerformanceStats();
      setStats(performanceStats);
    }, 100);
  };

  const handleForceCleanup = async () => {
    await memoryOptimizer.forceCleanup();
    // Refresh stats after cleanup
    setTimeout(() => {
      const memUsage = memoryOptimizer.getMemoryUsageMB();
      setMemoryUsage(memUsage);
    }, 1000);
  };

  const generateReport = () => {
    const report = storeIntegration.generatePerformanceReport();
    const memoryReport = memoryOptimizer.generateMemoryReport();
    
    const fullReport = [
      report,
      '',
      memoryReport
    ].join('\n');

    // Create and download report file
    const blob = new Blob([fullReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMemoryStatusColor = (usage: number, threshold: number): string => {
    if (usage > threshold * 1.5) return '#ff4444'; // Critical
    if (usage > threshold) return '#ffaa00'; // Warning
    return '#44ff44'; // Good
  };

  const getCacheEfficiency = (size: number, capacity: number): number => {
    return capacity > 0 ? (size / capacity) * 100 : 0;
  };

  return (
    <div className="performance-dashboard" style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🚀 Performance Dashboard</h2>
      
      {/* Control Panel */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Control Panel</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            style={{
              padding: '8px 16px',
              backgroundColor: isMonitoring ? '#ff4444' : '#44ff44',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
          </button>
          
          <button
            onClick={handleClearCaches}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffaa00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🧹 Clear Caches
          </button>
          
          <button
            onClick={handleForceCleanup}
            style={{
              padding: '8px 16px',
              backgroundColor: '#aa44ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Force Cleanup
          </button>
          
          <button
            onClick={generateReport}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4444ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📊 Generate Report
          </button>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            Refresh:
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{ padding: '4px' }}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </label>
        </div>
      </div>

      {/* Memory Usage */}
      {memoryUsage && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h3>💾 Memory Usage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>Heap Used</div>
              <div style={{ 
                color: getMemoryStatusColor(memoryUsage.heapUsed, 150),
                fontSize: '1.2em',
                fontWeight: 'bold'
              }}>
                {memoryUsage.heapUsed.toFixed(2)} MB
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>Heap Total</div>
              <div style={{ fontSize: '1.2em' }}>
                {memoryUsage.heapTotal.toFixed(2)} MB
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>External</div>
              <div style={{ fontSize: '1.2em' }}>
                {memoryUsage.external.toFixed(2)} MB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      {stats && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h3>📚 Cache Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            
            {/* Bookmark Cache */}
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Bookmark Cache</div>
              <div>Search Cache: {stats.bookmarkCache.searchCacheSize}</div>
              <div>Tag Cache: {stats.bookmarkCache.tagCacheSize}</div>
              <div>Index Cache: {stats.bookmarkCache.indexCacheSize}</div>
            </div>

            {/* History Cache */}
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>History Cache</div>
              <div>Pages Loaded: {stats.historyCache.loadedPages}</div>
              <div>Cache Size: {stats.historyCache.size}</div>
            </div>

            {/* Recommendation Cache */}
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Recommendation Cache</div>
              <div>Size: {stats.recommendationCache.size}/{stats.recommendationCache.capacity}</div>
              <div>Efficiency: {getCacheEfficiency(stats.recommendationCache.size, stats.recommendationCache.capacity).toFixed(1)}%</div>
            </div>

            {/* Search Cache */}
            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Search Cache</div>
              <div>Size: {stats.searchCache.size}/{stats.searchCache.capacity}</div>
              <div>Efficiency: {getCacheEfficiency(stats.searchCache.size, stats.searchCache.capacity).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>📈 Performance Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {performanceMonitor.getMetricNames().map(metricName => {
            const latest = performanceMonitor.getLatestMetric(metricName);
            const average = performanceMonitor.getAverageMetric(metricName);
            
            return (
              <div key={metricName} style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9em', marginBottom: '5px' }}>
                  {metricName.replace(/_/g, ' ').toUpperCase()}
                </div>
                {latest && (
                  <>
                    <div>Latest: {latest.value.toFixed(2)} {latest.category === 'timing' ? 'ms' : latest.category === 'memory' ? 'MB' : ''}</div>
                    <div>Average: {average.toFixed(2)} {latest.category === 'timing' ? 'ms' : latest.category === 'memory' ? 'MB' : ''}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: isMonitoring ? '#e8f5e8' : '#f5f5f5', borderRadius: '4px' }}>
        <strong>Status:</strong> {isMonitoring ? '🟢 Monitoring Active' : '🔴 Monitoring Inactive'}
        {isMonitoring && <span> (Refreshing every {refreshInterval / 1000}s)</span>}
      </div>
    </div>
  );
};

export default PerformanceDashboard;