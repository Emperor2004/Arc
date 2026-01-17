// Verification script to test DatabaseManager in Electron context
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Import the compiled DatabaseManager
const { DatabaseManager, TEST_CONFIG } = require('../dist/core/database/DatabaseManager.js');

app.whenReady().then(async () => {
  console.log('Testing DatabaseManager in Electron...');
  console.log('Electron version:', process.versions.electron);
  console.log('Module version:', process.versions.modules);

  try {
    // Create test database path
    const testDbPath = path.join(__dirname, '..', 'data', 'test-manager-verify.db');
    const testDbDir = path.dirname(testDbPath);
    
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    
    // Clean up if exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    console.log('\nInitializing DatabaseManager...');
    DatabaseManager.resetInstance();
    const manager = DatabaseManager.getInstance({ ...TEST_CONFIG, path: testDbPath });
    await manager.initialize();
    console.log('✓ DatabaseManager initialized successfully');
    
    // Test query
    console.log('\nTesting query operation...');
    const sessions = await manager.query('SELECT * FROM sessions LIMIT 1');
    console.log('✓ Query executed successfully:', sessions);
    
    // Test execute (insert)
    console.log('\nTesting execute operation...');
    const result = await manager.execute(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      ['test-key', 'test-value']
    );
    console.log('✓ Execute completed successfully:', result);
    
    // Test query to verify insert
    console.log('\nVerifying inserted data...');
    const settings = await manager.query('SELECT * FROM settings WHERE key = ?', ['test-key']);
    console.log('✓ Data verified:', settings);
    
    // Test health check
    console.log('\nTesting health check...');
    const isHealthy = await manager.checkHealth();
    console.log('✓ Health check:', isHealthy ? 'HEALTHY' : 'UNHEALTHY');
    
    // Close database
    console.log('\nClosing database...');
    await manager.close();
    console.log('✓ Database closed successfully');
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('✓ Test database cleaned up');
    }
    
    console.log('\n✅ All DatabaseManager tests passed!');
    app.quit();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    app.quit();
    process.exit(1);
  }
});
