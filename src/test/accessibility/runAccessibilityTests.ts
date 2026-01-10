#!/usr/bin/env node

/**
 * Accessibility Test Runner
 * Runs all accessibility tests and generates a comprehensive report
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AccessibilityAuditRunner } from './accessibilityAudit';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  errors: string[];
}

interface AccessibilityTestReport {
  timestamp: string;
  overallPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: TestResult[];
  auditReport?: any;
  summary: {
    keyboardNavigation: boolean;
    screenReader: boolean;
    highContrast: boolean;
    wcagCompliance: boolean;
  };
  recommendations: string[];
}

class AccessibilityTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<AccessibilityTestReport> {
    console.log('🚀 Starting comprehensive accessibility test suite...\n');

    // Run individual test suites
    await this.runTestSuite('Keyboard Navigation', 'src/test/accessibility/keyboardNavigation.test.ts');
    await this.runTestSuite('Screen Reader', 'src/test/accessibility/screenReader.test.ts');
    await this.runTestSuite('High Contrast', 'src/test/accessibility/highContrast.test.ts');
    await this.runTestSuite('Accessibility Auditor', 'src/core/accessibilityAuditor.test.ts');

    // Run comprehensive audit
    console.log('🔍 Running comprehensive accessibility audit...');
    let auditReport;
    try {
      const auditor = new AccessibilityAuditRunner();
      auditReport = await auditor.runCompleteAudit();
      console.log('✅ Accessibility audit completed');
    } catch (error) {
      console.error('❌ Accessibility audit failed:', error);
      this.results.push({
        name: 'Accessibility Audit',
        passed: false,
        duration: 0,
        errors: [String(error)]
      });
    }

    // Generate report
    const report = this.generateReport(auditReport);
    
    // Save report
    await this.saveReport(report);
    
    // Print summary
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(name: string, testFile: string): Promise<void> {
    console.log(`🧪 Running ${name} tests...`);
    
    const startTime = Date.now();
    let passed = true;
    const errors: string[] = [];

    try {
      // Run vitest for specific test file
      const command = `npx vitest run ${testFile} --reporter=json`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse vitest JSON output
      try {
        const result = JSON.parse(output);
        passed = result.success || false;
        
        if (result.testResults) {
          result.testResults.forEach((testResult: any) => {
            if (testResult.status === 'failed') {
              errors.push(`${testResult.name}: ${testResult.message}`);
            }
          });
        }
      } catch (parseError) {
        // If JSON parsing fails, check if tests passed by exit code
        passed = true; // execSync didn't throw, so tests likely passed
      }
      
      console.log(`✅ ${name} tests completed`);
    } catch (error: any) {
      passed = false;
      errors.push(error.message || String(error));
      console.log(`❌ ${name} tests failed`);
    }

    const duration = Date.now() - startTime;
    
    this.results.push({
      name,
      passed,
      duration,
      errors
    });
  }

  private generateReport(auditReport?: any): AccessibilityTestReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const keyboardPassed = this.results.find(r => r.name === 'Keyboard Navigation')?.passed || false;
    const screenReaderPassed = this.results.find(r => r.name === 'Screen Reader')?.passed || false;
    const highContrastPassed = this.results.find(r => r.name === 'High Contrast')?.passed || false;
    const wcagPassed = auditReport?.passed || false;

    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date().toISOString(),
      overallPassed: passedTests === totalTests && wcagPassed,
      totalTests,
      passedTests,
      failedTests,
      testResults: this.results,
      auditReport,
      summary: {
        keyboardNavigation: keyboardPassed,
        screenReader: screenReaderPassed,
        highContrast: highContrastPassed,
        wcagCompliance: wcagPassed
      },
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      recommendations.push('🎉 Excellent! All accessibility tests are passing.');
      recommendations.push('🔄 Continue to test with real assistive technologies.');
      recommendations.push('👥 Consider user testing with people who use assistive technologies.');
    } else {
      recommendations.push('🚨 Priority: Fix failing accessibility tests immediately.');
      
      failedTests.forEach(test => {
        switch (test.name) {
          case 'Keyboard Navigation':
            recommendations.push('⌨️ Ensure all interactive elements are keyboard accessible.');
            recommendations.push('🎯 Implement proper focus management and visible focus indicators.');
            break;
          case 'Screen Reader':
            recommendations.push('🏷️ Add proper ARIA labels and semantic HTML structure.');
            recommendations.push('📖 Ensure content is properly announced by screen readers.');
            break;
          case 'High Contrast':
            recommendations.push('🎨 Improve color contrast ratios to meet WCAG standards.');
            recommendations.push('🌓 Test with Windows High Contrast mode.');
            break;
        }
      });
    }

    recommendations.push('📚 Reference: https://www.w3.org/WAI/WCAG21/quickref/');
    recommendations.push('🛠️ Tools: Use axe-core, WAVE, or Lighthouse for additional testing.');

    return recommendations;
  }

  private async saveReport(report: AccessibilityTestReport): Promise<void> {
    const reportsDir = join(process.cwd(), 'test-results', 'accessibility');
    mkdirSync(reportsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `accessibility-test-report-${timestamp}.json`;
    const filepath = join(reportsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${filepath}`);
  }

  private printSummary(report: AccessibilityTestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🌐 ACCESSIBILITY TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`✅ Overall Status: ${report.overallPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`📊 Tests: ${report.passedTests}/${report.totalTests} passed`);
    
    console.log('\n📋 TEST RESULTS:');
    report.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${result.name} (${result.duration}ms)`);
      
      if (!result.passed && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      }
    });

    console.log('\n🎯 ACCESSIBILITY AREAS:');
    console.log(`   ⌨️  Keyboard Navigation: ${report.summary.keyboardNavigation ? 'PASS' : 'FAIL'}`);
    console.log(`   📱 Screen Reader: ${report.summary.screenReader ? 'PASS' : 'FAIL'}`);
    console.log(`   🎨 High Contrast: ${report.summary.highContrast ? 'PASS' : 'FAIL'}`);
    console.log(`   📏 WCAG Compliance: ${report.summary.wcagCompliance ? 'PASS' : 'FAIL'}`);

    if (report.auditReport) {
      console.log('\n📊 AUDIT SCORE:');
      console.log(`   Overall Score: ${report.auditReport.overallScore}%`);
      console.log(`   Critical Issues: ${report.auditReport.summary.criticalIssues}`);
      console.log(`   Serious Issues: ${report.auditReport.summary.seriousIssues}`);
    }

    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    console.log('\n' + '='.repeat(60));
    
    if (!report.overallPassed) {
      console.log('❌ Accessibility tests failed. Please address the issues above.');
      process.exit(1);
    } else {
      console.log('🎉 All accessibility tests passed!');
    }
  }
}

// CLI execution
async function main() {
  const runner = new AccessibilityTestRunner();
  
  try {
    await runner.runAllTests();
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { AccessibilityTestRunner };

// Run if called directly
if (require.main === module) {
  main();
}