// Verification script to test main process initialization
const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Testing main process initialization...');
console.log('Electron version:', process.versions.electron);
console.log('Module version:', process.versions.modules);

let mainWindow;
let initSuccess = false;

app.whenReady().then(async () => {
  try {
    console.log('\n📦 App ready, initializing...');
    
    // Try to import DatabaseManager
    console.log('📦 Importing DatabaseManager...');
    const { DatabaseManager, DEFAULT_CONFIG } = require('../dist/core/database/DatabaseManager.js');
    console.log('✓ DatabaseManager imported successfully');
    
    // Try to initialize database
    console.log('\n📦 Initializing database...');
    const testDbPath = path.join(__dirname, '..', 'data', 'test-main-process.db');
    DatabaseManager.resetInstance();
    const manager = DatabaseManager.getInstance({ ...DEFAULT_CONFIG, path: testDbPath });
    await manager.initialize();
    console.log('✓ Database initialized successfully');
    
    // Check health
    const isHealthy = await manager.checkHealth();
    console.log('✓ Database health check:', isHealthy ? 'HEALTHY' : 'UNHEALTHY');
    
    // Close database
    await manager.close();
    console.log('✓ Database closed successfully');
    
    // Clean up
    const fs = require('fs');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('✓ Test database cleaned up');
    }
    
    console.log('\n✅ Main process initialization successful!');
    console.log('✅ No better-sqlite3 ABI errors detected!');
    initSuccess = true;
    
  } catch (error) {
    console.error('\n❌ Main process initialization failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Check if it's the ABI error
    if (error.message.includes('NODE_MODULE_VERSION')) {
      console.error('\n⚠️  This is the ABI mismatch error we were trying to fix!');
    }
  } finally {
    app.quit();
    process.exit(initSuccess ? 0 : 1);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
