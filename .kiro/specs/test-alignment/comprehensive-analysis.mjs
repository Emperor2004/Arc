import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';

// Find all test files recursively
function findTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'build' && file !== 'release') {
        findTestFiles(filePath, fileList);
      }
    } else if (file.match(/\.(test|pbt\.test)\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

const testFiles = findTestFiles('src');
console.log(`\n=== TEST ALIGNMENT ANALYSIS ===\n`);
console.log(`Found ${testFiles.length} test files\n`);

const report = {
  summary: {
    totalTests: testFiles.length,
    unitTests: 0,
    propertyBasedTests: 0,
    integrationTests: 0,
    performanceTests: 0,
    accessibilityTests: 0
  },
  issues: {
    brokenImports: [],
    sqliteMisalignment: [],
    mockIssues: [],
    environmentIssues: [],
    coverageGaps: []
  },
  statistics: {
    totalImports: 0,
    brokenImportsCount: 0,
    testsUsingLocalStorage: 0,
    testsUsingDatabaseManager: 0,
    testsWithMocks: 0,
    propertyTestsWithoutAnnotations: 0
  }
};

// Categorize tests
for (const testFile of testFiles) {
  const fileName = testFile.split('\\').pop();
  const relativePath = relative(process.cwd(), testFile).replace(/\\/g, '/');
  
  if (fileName.includes('.pbt.test.')) {
    report.summary.propertyBasedTests++;
  } else {
    report.summary.unitTests++;
  }
  
  if (relativePath.includes('test/integration')) {
    report.summary.integrationTests++;
  }
  
  if (relativePath.includes('test/performance')) {
    report.summary.performanceTests++;
  }
  
  if (relativePath.includes('test/accessibility')) {
    report.summary.accessibilityTests++;
  }
}

console.log(`Test Categories:`);
console.log(`  Unit Tests: ${report.summary.unitTests}`);
console.log(`  Property-Based Tests: ${report.summary.propertyBasedTests}`);
console.log(`  Integration Tests: ${report.summary.integrationTests}`);
console.log(`  Performance Tests: ${report.summary.performanceTests}`);
console.log(`  Accessibility Tests: ${report.summary.accessibilityTests}\n`);

// Analyze each test file
for (const testFile of testFiles) {
  const content = readFileSync(testFile, 'utf-8');
  const relativePath = relative(process.cwd(), testFile).replace(/\\/g, '/');
  
  // 1. Check imports
  const importRegex = /import\s+(?:{[^}]+}|[\w*]+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    report.statistics.totalImports++;
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
      report.statistics.brokenImportsCount++;
      report.issues.brokenImports.push({
        file: relativePath,
        import: importPath,
        line: content.substring(0, match.index).split('\n').length,
        severity: 'error'
      });
    }
  }
  
  // 2. Check for SQLite store usage
  const usesHistoryStore = content.includes("from '../../core/historyStore'") || 
                          content.includes('from "../../core/historyStore"');
  const usesHistoryStoreMain = content.includes("from '../../core/historyStoreMain'") || 
                               content.includes('from "../../core/historyStoreMain"');
  const usesBookmarkStore = content.includes("from '../../core/bookmarkStore'") || 
                           content.includes('from "../../core/bookmarkStore"');
  const usesBookmarkStoreMain = content.includes("from '../../core/bookmarkStoreMain'") || 
                                content.includes('from "../../core/bookmarkStoreMain"');
  const usesSettingsStore = content.includes("from '../../core/settingsStore'") || 
                           content.includes('from "../../core/settingsStore"');
  const usesSettingsStoreMain = content.includes("from '../../core/settingsStoreMain'") || 
                                content.includes('from "../../core/settingsStoreMain"');
  
  // Check if test should use Main versions (tests that validate persistence)
  const testsPersistence = content.includes('persist') || content.includes('save') || 
                          content.includes('load') || content.includes('database');
  
  if (testsPersistence && (usesHistoryStore || usesBookmarkStore || usesSettingsStore) && 
      !usesHistoryStoreMain && !usesBookmarkStoreMain && !usesSettingsStoreMain) {
    report.issues.sqliteMisalignment.push({
      file: relativePath,
      issue: 'Test validates persistence but uses localStorage-backed store instead of SQLite Main version',
      severity: 'warning'
    });
  }
  
  // 3. Check for localStorage usage
  if (content.includes('localStorage')) {
    report.statistics.testsUsingLocalStorage++;
    
    // Check if it's for history/bookmarks/settings (should use SQLite)
    if ((content.includes('history') || content.includes('bookmark') || content.includes('settings')) &&
        !relativePath.includes('feedbackStore')) {
      report.issues.sqliteMisalignment.push({
        file: relativePath,
        issue: 'Test uses localStorage directly for history/bookmarks/settings (should use SQLite stores)',
        severity: 'warning'
      });
    }
  }
  
  // 4. Check for DatabaseManager usage
  if (content.includes('DatabaseManager')) {
    report.statistics.testsUsingDatabaseManager++;
  }
  
  // 5. Check for mocks
  if (content.includes('vi.mock(')) {
    report.statistics.testsWithMocks++;
    
    // Extract mock paths
    const mockRegex = /vi\.mock\(['"]([^'"]+)['"]/g;
    let mockMatch;
    
    while ((mockMatch = mockRegex.exec(content)) !== null) {
      const mockPath = mockMatch[1];
      
      // Check if mock path is valid
      if (mockPath.startsWith('.')) {
        const testDir = dirname(testFile);
        let resolvedMockPath = resolve(testDir, mockPath);
        
        const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
        let found = false;
        
        for (const ext of extensions) {
          if (existsSync(resolvedMockPath + ext)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          report.issues.mockIssues.push({
            file: relativePath,
            mock: mockPath,
            issue: 'Mock path does not resolve to existing module',
            severity: 'error'
          });
        }
      }
    }
  }
  
  // 6. Check property-based tests for annotations
  if (relativePath.includes('.pbt.test.')) {
    const hasValidatesAnnotation = content.includes('**Validates: Requirements');
    const hasFeatureTag = content.includes('Feature:') && content.includes('Property');
    
    if (!hasValidatesAnnotation && !hasFeatureTag) {
      report.statistics.propertyTestsWithoutAnnotations++;
      report.issues.coverageGaps.push({
        file: relativePath,
        issue: 'Property-based test missing requirement annotation or feature tag',
        severity: 'warning'
      });
    }
  }
  
  // 7. Check environment usage
  const usesDOMAPIs = content.includes('document.') || content.includes('window.') || 
                     content.includes('localStorage') || content.includes('render(');
  const usesNodeAPIs = content.includes("from 'fs'") || content.includes("from 'path'") || 
                      content.includes('better-sqlite3') || content.includes('DatabaseManager');
  
  if (usesDOMAPIs && usesNodeAPIs) {
    report.issues.environmentIssues.push({
      file: relativePath,
      issue: 'Test uses both DOM APIs and Node.js APIs - may have environment configuration issues',
      severity: 'warning'
    });
  }
}

// Check Phase 10 feature coverage
console.log(`\n=== PHASE 10 FEATURE COVERAGE ===\n`);

const phase10Features = [
  { name: 'Session Management', keywords: ['session', 'SessionManager', 'sessionManager'] },
  { name: 'Tab Groups', keywords: ['tabGroup', 'TabGroup', 'tabGroupManager'] },
  { name: 'Advanced History Search', keywords: ['historySearch', 'HistorySearch', 'historySearchManager'] },
  { name: 'Recommendation Personalization', keywords: ['personalization', 'Personalization', 'personalizationManager'] },
  { name: 'Performance Optimization', keywords: ['performance', 'Performance', 'benchmark'] },
  { name: 'Accessibility', keywords: ['accessibility', 'Accessibility', 'a11y', 'wcag'] }
];

for (const feature of phase10Features) {
  const featureTests = testFiles.filter(file => {
    const content = readFileSync(file, 'utf-8');
    return feature.keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
  });
  
  const status = featureTests.length > 0 ? '✅' : '⚠️';
  console.log(`${status} ${feature.name}: ${featureTests.length} test file(s)`);
  
  if (featureTests.length === 0) {
    report.issues.coverageGaps.push({
      feature: feature.name,
      issue: 'No tests found for Phase 10 feature',
      severity: 'high'
    });
  }
}

// Print summary
console.log(`\n=== ISSUES SUMMARY ===\n`);
console.log(`Total Imports Analyzed: ${report.statistics.totalImports}`);
console.log(`Broken Imports: ${report.statistics.brokenImportsCount}`);
console.log(`SQLite Misalignment Issues: ${report.issues.sqliteMisalignment.length}`);
console.log(`Mock Issues: ${report.issues.mockIssues.length}`);
console.log(`Environment Issues: ${report.issues.environmentIssues.length}`);
console.log(`Coverage Gaps: ${report.issues.coverageGaps.length}`);
console.log(`Property Tests Without Annotations: ${report.statistics.propertyTestsWithoutAnnotations}`);

console.log(`\n=== STATISTICS ===\n`);
console.log(`Tests Using localStorage: ${report.statistics.testsUsingLocalStorage}`);
console.log(`Tests Using DatabaseManager: ${report.statistics.testsUsingDatabaseManager}`);
console.log(`Tests With Mocks: ${report.statistics.testsWithMocks}`);

// Save detailed report
writeFileSync(
  '.kiro/specs/test-alignment/analysis-report.json',
  JSON.stringify(report, null, 2)
);

console.log(`\nDetailed report saved to .kiro/specs/test-alignment/analysis-report.json`);

// Generate markdown report
let markdown = `# Test Alignment Analysis Report

## Summary

- **Total Test Files**: ${report.summary.totalTests}
- **Unit Tests**: ${report.summary.unitTests}
- **Property-Based Tests**: ${report.summary.propertyBasedTests}
- **Integration Tests**: ${report.summary.integrationTests}
- **Performance Tests**: ${report.summary.performanceTests}
- **Accessibility Tests**: ${report.summary.accessibilityTests}

## Issues Found

### Critical Issues (${report.statistics.brokenImportsCount})

#### Broken Imports
${report.issues.brokenImports.length > 0 ? report.issues.brokenImports.map(issue => 
  `- **${issue.file}:${issue.line}**\n  - Import: \`${issue.import}\`\n  - Fix: Update import path to correct location`
).join('\n\n') : 'None'}

### High Priority Issues

#### SQLite Misalignment (${report.issues.sqliteMisalignment.length})
${report.issues.sqliteMisalignment.length > 0 ? report.issues.sqliteMisalignment.map(issue => 
  `- **${issue.file}**\n  - Issue: ${issue.issue}`
).join('\n\n') : 'None'}

#### Mock Issues (${report.issues.mockIssues.length})
${report.issues.mockIssues.length > 0 ? report.issues.mockIssues.map(issue => 
  `- **${issue.file}**\n  - Mock: \`${issue.mock}\`\n  - Issue: ${issue.issue}`
).join('\n\n') : 'None'}

### Medium Priority Issues

#### Environment Issues (${report.issues.environmentIssues.length})
${report.issues.environmentIssues.length > 0 ? report.issues.environmentIssues.map(issue => 
  `- **${issue.file}**\n  - Issue: ${issue.issue}`
).join('\n\n') : 'None'}

#### Coverage Gaps (${report.issues.coverageGaps.length})
${report.issues.coverageGaps.length > 0 ? report.issues.coverageGaps.map(issue => 
  issue.feature ? `- **${issue.feature}**: ${issue.issue}` : `- **${issue.file}**: ${issue.issue}`
).join('\n') : 'None'}

## Phase 10 Feature Coverage

${phase10Features.map(feature => {
  const featureTests = testFiles.filter(file => {
    const content = readFileSync(file, 'utf-8');
    return feature.keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
  });
  const status = featureTests.length > 0 ? '✅' : '⚠️';
  return `${status} **${feature.name}**: ${featureTests.length} test file(s)`;
}).join('\n')}

## Statistics

- **Total Imports Analyzed**: ${report.statistics.totalImports}
- **Tests Using localStorage**: ${report.statistics.testsUsingLocalStorage}
- **Tests Using DatabaseManager**: ${report.statistics.testsUsingDatabaseManager}
- **Tests With Mocks**: ${report.statistics.testsWithMocks}
- **Property Tests Without Annotations**: ${report.statistics.propertyTestsWithoutAnnotations}

## Recommendations

### Immediate Actions (Critical)
${report.statistics.brokenImportsCount > 0 ? `
1. **Fix Broken Imports**: ${report.statistics.brokenImportsCount} import(s) need to be corrected
   - Review each broken import and update to correct path
   - Run tests to verify fixes
` : '✅ No broken imports found'}

### High Priority Actions
${report.issues.sqliteMisalignment.length > 0 ? `
2. **SQLite Store Alignment**: ${report.issues.sqliteMisalignment.length} test(s) may need to use SQLite-backed stores
   - Review tests that validate persistence
   - Update to use *Main versions where appropriate
   - Add DatabaseManager mocks if needed
` : '✅ SQLite store usage looks good'}

${report.issues.mockIssues.length > 0 ? `
3. **Mock Path Fixes**: ${report.issues.mockIssues.length} mock(s) have invalid paths
   - Update mock paths to correct locations
   - Verify mocked modules exist
` : '✅ Mock paths look good'}

### Medium Priority Actions
${report.statistics.propertyTestsWithoutAnnotations > 0 ? `
4. **Property Test Annotations**: ${report.statistics.propertyTestsWithoutAnnotations} property test(s) missing annotations
   - Add "**Validates: Requirements X.Y**" annotations
   - Add feature tags for traceability
` : '✅ Property test annotations look good'}

${report.issues.coverageGaps.filter(g => g.feature).length > 0 ? `
5. **Phase 10 Coverage Gaps**: Add tests for missing features
${report.issues.coverageGaps.filter(g => g.feature).map(g => `   - ${g.feature}`).join('\n')}
` : '✅ Phase 10 feature coverage looks good'}

## Next Steps

1. Review this report with the team
2. Prioritize fixes based on severity
3. Apply critical fixes first (broken imports)
4. Update SQLite store usage where needed
5. Add missing Phase 10 feature tests
6. Run full test suite to verify all fixes
`;

writeFileSync('.kiro/specs/test-alignment/ANALYSIS_REPORT.md', markdown);
console.log(`Markdown report saved to .kiro/specs/test-alignment/ANALYSIS_REPORT.md\n`);
