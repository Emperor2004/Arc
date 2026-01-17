// Verification script to test better-sqlite3 in Electron context
const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  console.log('Testing better-sqlite3 module in Electron...');
  console.log('Electron version:', process.versions.electron);
  console.log('Node.js version:', process.version);
  console.log('Module version:', process.versions.modules);

  try {
    // Create a test database
    const testDbPath = path.join(__dirname, '..', 'data', 'test-verify-electron.db');
    const testDbDir = path.dirname(testDbPath);
    
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    
    console.log('\nCreating test database at:', testDbPath);
    const db = new Database(testDbPath);
    
    console.log('✓ Database created successfully');
    
    // Create a test table
    db.exec(`
      CREATE TABLE IF NOT EXISTS test (
        id INTEGER PRIMARY KEY,
        value TEXT
      )
    `);
    console.log('✓ Table created successfully');
    
    // Insert test data
    const insert = db.prepare('INSERT INTO test (value) VALUES (?)');
    insert.run('test-value-electron');
    console.log('✓ Data inserted successfully');
    
    // Query test data
    const select = db.prepare('SELECT * FROM test');
    const rows = select.all();
    console.log('✓ Data queried successfully:', rows);
    
    // Close database
    db.close();
    console.log('✓ Database closed successfully');
    
    // Clean up test database
    fs.unlinkSync(testDbPath);
    console.log('✓ Test database cleaned up');
    
    console.log('\n✅ All tests passed! better-sqlite3 is working correctly in Electron.');
    app.quit();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    app.quit();
    process.exit(1);
  }
});
