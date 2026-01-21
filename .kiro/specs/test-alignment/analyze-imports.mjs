import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';

// Find all test files recursively
function findTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'build') {
        findTestFiles(filePath, fileList);
      }
    } else if (file.match(/\.(test|pbt\.test)\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

const testFiles = findTestFiles('src');

console.log(`Found ${testFiles.length} test files\n`);

const issues = [];
let totalImports = 0;
let brokenImports = 0;

// Analyze each test file
for (const testFile of testFiles) {
  const content = readFileSync(testFile, 'utf-8');
  const relativePath = testFile.replace(process.cwd() + '\\', '').replace(/\\/g, '/');
  
  // Extract import statements
  const importRegex = /import\s+(?:{[^}]+}|[\w*]+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    totalImports++;
    const importPath = match[1];
    
    // Skip node_modules and built-in modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      continue;
    }
    
    // Resolve the import path
    const testDir = dirname(testFile);
    let resolvedPath = resolve(testDir, importPath);
    
    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    let found = false;
    
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext;
      if (existsSync(pathWithExt)) {
        found = true;
        break;
      }
    }
    
    // Check if it's a directory with index file
    if (!found) {
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const indexPath = join(resolvedPath, 'index' + ext);
        if (existsSync(indexPath)) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      brokenImports++;
      issues.push({
        file: relativePath,
        import: importPath,
        resolved: resolvedPath,
        type: 'broken-import'
      });
    }
  }
}

console.log(`Total imports analyzed: ${totalImports}`);
console.log(`Broken imports found: ${brokenImports}\n`);

if (issues.length > 0) {
  console.log('BROKEN IMPORTS:\n');
  for (const issue of issues) {
    console.log(`File: ${issue.file}`);
    console.log(`  Import: "${issue.import}"`);
    console.log(`  Resolved to: ${issue.resolved}`);
    console.log('');
  }
}

// Write results to file
import { writeFileSync } from 'fs';
writeFileSync(
  '.kiro/specs/test-alignment/import-analysis.json',
  JSON.stringify({ totalImports, brokenImports, issues }, null, 2)
);

console.log('Results saved to .kiro/specs/test-alignment/import-analysis.json');
