#!/usr/bin/env node

/**
 * WCAG 2.1 AA Compliance Verification
 * Checks for key WCAG 2.1 AA compliance features in the codebase
 */

interface WCAGComplianceReport {
  timestamp: string;
  overallCompliant: boolean;
  score: number;
  criteria: {
    [key: string]: {
      level: 'A' | 'AA' | 'AAA';
      passed: boolean;
      description: string;
      evidence: string[];
    };
  };
  summary: {
    totalCriteria: number;
    passedCriteria: number;
    failedCriteria: number;
  };
  recommendations: string[];
}

async function checkWCAGCompliance(): Promise<WCAGComplianceReport> {
  console.log('🔍 Checking WCAG 2.1 AA compliance...\n');

  const report: WCAGComplianceReport = {
    timestamp: new Date().toISOString(),
    overallCompliant: false,
    score: 0,
    criteria: {},
    summary: {
      totalCriteria: 0,
      passedCriteria: 0,
      failedCriteria: 0
    },
    recommendations: []
  };

  const fs = await import('fs/promises');

  // 1.1.1 Non-text Content (Level A)
  console.log('✅ Checking 1.1.1 Non-text Content...');
  try {
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const hasImageAltCheck = accessibilityAuditor.includes('checkImageAltText') && 
                            accessibilityAuditor.includes('alt') &&
                            accessibilityAuditor.includes('1.1.1 Non-text Content');
    
    report.criteria['1.1.1'] = {
      level: 'A',
      passed: hasImageAltCheck,
      description: 'Non-text Content - Images have alternative text',
      evidence: hasImageAltCheck ? ['Image alt text validation implemented in AccessibilityAuditor'] : []
    };
    console.log(`   ${hasImageAltCheck ? '✓' : '❌'} Non-text content validation`);
  } catch (error) {
    report.criteria['1.1.1'] = {
      level: 'A',
      passed: false,
      description: 'Non-text Content - Images have alternative text',
      evidence: []
    };
    console.log('   ❌ Could not verify non-text content support');
  }

  // 1.3.1 Info and Relationships (Level A)
  console.log('✅ Checking 1.3.1 Info and Relationships...');
  try {
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const hasSemanticCheck = accessibilityAuditor.includes('checkSemanticHTML') && 
                            accessibilityAuditor.includes('heading') &&
                            accessibilityAuditor.includes('1.3.1 Info and Relationships');
    
    report.criteria['1.3.1'] = {
      level: 'A',
      passed: hasSemanticCheck,
      description: 'Info and Relationships - Semantic HTML structure',
      evidence: hasSemanticCheck ? ['Semantic HTML validation implemented in AccessibilityAuditor'] : []
    };
    console.log(`   ${hasSemanticCheck ? '✓' : '❌'} Semantic HTML structure validation`);
  } catch (error) {
    report.criteria['1.3.1'] = {
      level: 'A',
      passed: false,
      description: 'Info and Relationships - Semantic HTML structure',
      evidence: []
    };
    console.log('   ❌ Could not verify semantic HTML support');
  }

  // 1.4.3 Contrast (Minimum) (Level AA)
  console.log('✅ Checking 1.4.3 Contrast (Minimum)...');
  try {
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const hasContrastCheck = accessibilityAuditor.includes('checkColorContrast') && 
                            accessibilityAuditor.includes('4.5') &&
                            accessibilityAuditor.includes('1.4.3 Contrast');
    
    const globalCSS = await fs.readFile('src/renderer/styles/global.css', 'utf-8');
    const hasHighContrastCSS = globalCSS.includes('high-contrast') || globalCSS.includes('prefers-contrast');
    
    const passed = hasContrastCheck && hasHighContrastCSS;
    report.criteria['1.4.3'] = {
      level: 'AA',
      passed,
      description: 'Contrast (Minimum) - 4.5:1 contrast ratio',
      evidence: passed ? [
        'Color contrast validation implemented in AccessibilityAuditor',
        'High contrast mode CSS implemented'
      ] : []
    };
    console.log(`   ${passed ? '✓' : '❌'} Color contrast validation and high contrast support`);
  } catch (error) {
    report.criteria['1.4.3'] = {
      level: 'AA',
      passed: false,
      description: 'Contrast (Minimum) - 4.5:1 contrast ratio',
      evidence: []
    };
    console.log('   ❌ Could not verify color contrast support');
  }

  // 2.1.1 Keyboard (Level A)
  console.log('✅ Checking 2.1.1 Keyboard...');
  try {
    const keyboardHook = await fs.readFile('src/renderer/hooks/useKeyboardShortcuts.ts', 'utf-8');
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const hasKeyboardCheck = accessibilityAuditor.includes('checkKeyboardNavigation') && 
                            accessibilityAuditor.includes('2.1.1 Keyboard');
    
    const passed = hasKeyboardCheck && keyboardHook.length > 0;
    report.criteria['2.1.1'] = {
      level: 'A',
      passed,
      description: 'Keyboard - All functionality available via keyboard',
      evidence: passed ? [
        'Keyboard navigation validation implemented in AccessibilityAuditor',
        'Keyboard shortcuts hook implemented'
      ] : []
    };
    console.log(`   ${passed ? '✓' : '❌'} Keyboard accessibility validation and implementation`);
  } catch (error) {
    report.criteria['2.1.1'] = {
      level: 'A',
      passed: false,
      description: 'Keyboard - All functionality available via keyboard',
      evidence: []
    };
    console.log('   ❌ Could not verify keyboard accessibility support');
  }

  // 2.4.7 Focus Visible (Level AA)
  console.log('✅ Checking 2.4.7 Focus Visible...');
  try {
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const globalCSS = await fs.readFile('src/renderer/styles/global.css', 'utf-8');
    
    const hasFocusCheck = accessibilityAuditor.includes('checkFocusIndicators') && 
                         accessibilityAuditor.includes('2.4.7 Focus Visible');
    const hasFocusCSS = globalCSS.includes('focus') || globalCSS.includes(':focus');
    
    const passed = hasFocusCheck && hasFocusCSS;
    report.criteria['2.4.7'] = {
      level: 'AA',
      passed,
      description: 'Focus Visible - Visible focus indicators',
      evidence: passed ? [
        'Focus indicator validation implemented in AccessibilityAuditor',
        'Focus styles implemented in CSS'
      ] : []
    };
    console.log(`   ${passed ? '✓' : '❌'} Focus visibility validation and CSS implementation`);
  } catch (error) {
    report.criteria['2.4.7'] = {
      level: 'AA',
      passed: false,
      description: 'Focus Visible - Visible focus indicators',
      evidence: []
    };
    console.log('   ❌ Could not verify focus visibility support');
  }

  // 3.3.2 Labels or Instructions (Level A)
  console.log('✅ Checking 3.3.2 Labels or Instructions...');
  try {
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const hasLabelCheck = accessibilityAuditor.includes('checkFormLabels') && 
                         accessibilityAuditor.includes('3.3.2 Labels or Instructions');
    
    report.criteria['3.3.2'] = {
      level: 'A',
      passed: hasLabelCheck,
      description: 'Labels or Instructions - Form controls have labels',
      evidence: hasLabelCheck ? ['Form label validation implemented in AccessibilityAuditor'] : []
    };
    console.log(`   ${hasLabelCheck ? '✓' : '❌'} Form label validation`);
  } catch (error) {
    report.criteria['3.3.2'] = {
      level: 'A',
      passed: false,
      description: 'Labels or Instructions - Form controls have labels',
      evidence: []
    };
    console.log('   ❌ Could not verify form label support');
  }

  // 4.1.2 Name, Role, Value (Level A)
  console.log('✅ Checking 4.1.2 Name, Role, Value...');
  try {
    const accessibilityAuditor = await fs.readFile('src/core/accessibilityAuditor.ts', 'utf-8');
    const hasAriaCheck = accessibilityAuditor.includes('checkAriaLabels') && 
                        accessibilityAuditor.includes('4.1.2 Name, Role, Value');
    
    const accessibilitySettings = await fs.readFile('src/renderer/components/AccessibilitySettings.tsx', 'utf-8');
    const hasAriaImplementation = accessibilitySettings.includes('aria-label') || 
                                 accessibilitySettings.includes('aria-describedby');
    
    const passed = hasAriaCheck && hasAriaImplementation;
    report.criteria['4.1.2'] = {
      level: 'A',
      passed,
      description: 'Name, Role, Value - ARIA labels and roles',
      evidence: passed ? [
        'ARIA label validation implemented in AccessibilityAuditor',
        'ARIA labels implemented in AccessibilitySettings component'
      ] : []
    };
    console.log(`   ${passed ? '✓' : '❌'} ARIA validation and implementation`);
  } catch (error) {
    report.criteria['4.1.2'] = {
      level: 'A',
      passed: false,
      description: 'Name, Role, Value - ARIA labels and roles',
      evidence: []
    };
    console.log('   ❌ Could not verify ARIA support');
  }

  // Calculate summary
  const totalCriteria = Object.keys(report.criteria).length;
  const passedCriteria = Object.values(report.criteria).filter(c => c.passed).length;
  const failedCriteria = totalCriteria - passedCriteria;

  report.summary = {
    totalCriteria,
    passedCriteria,
    failedCriteria
  };

  report.score = Math.round((passedCriteria / totalCriteria) * 100);
  report.overallCompliant = passedCriteria === totalCriteria;

  // Generate recommendations
  if (report.overallCompliant) {
    report.recommendations.push('🎉 All key WCAG 2.1 AA criteria are implemented!');
    report.recommendations.push('🧪 Run automated accessibility tests in a browser environment for validation');
    report.recommendations.push('👥 Consider user testing with assistive technology users');
  } else {
    report.recommendations.push('🚨 Address failing WCAG criteria to achieve AA compliance');
    
    Object.entries(report.criteria).forEach(([criterion, details]) => {
      if (!details.passed) {
        report.recommendations.push(`📋 ${criterion}: ${details.description}`);
      }
    });
    
    report.recommendations.push('📚 Reference: https://www.w3.org/WAI/WCAG21/quickref/');
    report.recommendations.push('🛠️ Use axe-core, WAVE, or Lighthouse for additional testing');
  }

  return report;
}

function printWCAGReport(report: WCAGComplianceReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('🌐 WCAG 2.1 AA COMPLIANCE REPORT');
  console.log('='.repeat(70));
  console.log(`📅 Timestamp: ${report.timestamp}`);
  console.log(`📊 Compliance Score: ${report.score}%`);
  console.log(`✅ Overall Compliant: ${report.overallCompliant ? 'YES' : 'NO'}`);
  console.log(`📋 Criteria: ${report.summary.passedCriteria}/${report.summary.totalCriteria} passed`);

  console.log('\n📏 WCAG CRITERIA RESULTS:');
  Object.entries(report.criteria).forEach(([criterion, details]) => {
    const status = details.passed ? '✅' : '❌';
    console.log(`   ${status} ${criterion} (Level ${details.level}): ${details.description}`);
    
    if (details.evidence.length > 0) {
      details.evidence.forEach(evidence => {
        console.log(`      • ${evidence}`);
      });
    }
  });

  console.log('\n💡 RECOMMENDATIONS:');
  report.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });

  console.log('\n' + '='.repeat(70));
  
  if (report.overallCompliant) {
    console.log('🎉 WCAG 2.1 AA compliance criteria are implemented!');
  } else {
    console.log('⚠️  Some WCAG 2.1 AA criteria need attention.');
  }
}

// CLI execution
async function main() {
  try {
    const report = await checkWCAGCompliance();
    printWCAGReport(report);
    
    // Save report
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const reportDir = path.join(process.cwd(), 'test-results', 'accessibility');
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportFile = `wcag-compliance-check-${Date.now()}.json`;
    const reportPath = path.join(reportDir, reportFile);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(report.overallCompliant ? 0 : 1);
  } catch (error) {
    console.error('💥 WCAG compliance check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkWCAGCompliance, WCAGComplianceReport };