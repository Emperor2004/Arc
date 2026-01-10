/**
 * Comprehensive Accessibility Audit Script
 * Runs automated WCAG 2.1 AA checks on the Arc Browser application
 */

import { AccessibilityAuditor, HighContrastTester, ScreenReaderTester } from '../../core/accessibilityAuditor';

export interface AccessibilityAuditReport {
  timestamp: string;
  overallScore: number;
  passed: boolean;
  summary: {
    totalChecks: number;
    passedChecks: number;
    criticalIssues: number;
    seriousIssues: number;
    moderateIssues: number;
    minorIssues: number;
  };
  keyboardNavigation: {
    passed: boolean;
    focusableElements: number;
    issues: string[];
  };
  highContrast: {
    supported: boolean;
    currentlyEnabled: boolean;
  };
  screenReader: {
    ariaTreeNodes: number;
    hasProperStructure: boolean;
  };
  detailedIssues: any[];
  recommendations: string[];
}

export class AccessibilityAuditRunner {
  private auditor: AccessibilityAuditor;

  constructor() {
    this.auditor = new AccessibilityAuditor();
  }

  async runCompleteAudit(): Promise<AccessibilityAuditReport> {
    console.log('🔍 Starting comprehensive accessibility audit...');
    
    // Run main accessibility audit
    const auditResult = await this.auditor.runFullAudit();
    
    // Test keyboard navigation
    const keyboardResult = this.auditor.testKeyboardNavigation();
    
    // Test high contrast support
    const highContrastSupported = HighContrastTester.testHighContrastSupport();
    const highContrastEnabled = HighContrastTester.isHighContrastMode();
    
    // Analyze screen reader support
    const ariaTree = ScreenReaderTester.getAriaTree();
    const ariaTreeNodes = this.countAriaTreeNodes(ariaTree);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(auditResult, keyboardResult);
    
    const report: AccessibilityAuditReport = {
      timestamp: new Date().toISOString(),
      overallScore: auditResult.score,
      passed: auditResult.passed && keyboardResult.passed,
      summary: {
        totalChecks: auditResult.totalChecks,
        passedChecks: auditResult.passedChecks,
        criticalIssues: auditResult.summary.critical,
        seriousIssues: auditResult.summary.serious,
        moderateIssues: auditResult.summary.moderate,
        minorIssues: auditResult.summary.minor
      },
      keyboardNavigation: {
        passed: keyboardResult.passed,
        focusableElements: keyboardResult.focusableElements,
        issues: keyboardResult.issues
      },
      highContrast: {
        supported: highContrastSupported,
        currentlyEnabled: highContrastEnabled
      },
      screenReader: {
        ariaTreeNodes,
        hasProperStructure: ariaTreeNodes > 0
      },
      detailedIssues: auditResult.issues,
      recommendations
    };

    return report;
  }
  private countAriaTreeNodes(tree: any): number {
    let count = 1;
    if (tree.children && Array.isArray(tree.children)) {
      tree.children.forEach((child: any) => {
        count += this.countAriaTreeNodes(child);
      });
    }
    return count;
  }

  private generateRecommendations(auditResult: any, keyboardResult: any): string[] {
    const recommendations: string[] = [];

    if (auditResult.summary.critical > 0) {
      recommendations.push('🚨 Critical: Fix all critical accessibility issues immediately');
    }

    if (auditResult.summary.serious > 0) {
      recommendations.push('⚠️ High Priority: Address serious accessibility violations');
    }

    if (!keyboardResult.passed) {
      recommendations.push('⌨️ Keyboard: Ensure all interactive elements are keyboard accessible');
    }

    if (auditResult.score < 80) {
      recommendations.push('📊 Score: Improve overall accessibility score to at least 80%');
    }

    const ariaIssues = auditResult.issues.filter((i: any) => i.rule === 'aria-labels');
    if (ariaIssues.length > 0) {
      recommendations.push('🏷️ ARIA: Add proper ARIA labels to all interactive elements');
    }

    const contrastIssues = auditResult.issues.filter((i: any) => i.rule === 'color-contrast');
    if (contrastIssues.length > 0) {
      recommendations.push('🎨 Contrast: Improve color contrast ratios to meet WCAG AA standards');
    }

    const formIssues = auditResult.issues.filter((i: any) => i.rule === 'form-labels');
    if (formIssues.length > 0) {
      recommendations.push('📝 Forms: Associate all form controls with descriptive labels');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Excellent: Your application meets accessibility standards!');
    }

    return recommendations;
  }

  printReport(report: AccessibilityAuditReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🌐 ACCESSIBILITY AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`📊 Overall Score: ${report.overallScore}%`);
    console.log(`✅ Passed: ${report.passed ? 'YES' : 'NO'}`);
    
    console.log('\n📋 SUMMARY:');
    console.log(`   Total Checks: ${report.summary.totalChecks}`);
    console.log(`   Passed Checks: ${report.summary.passedChecks}`);
    console.log(`   🚨 Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   ⚠️  Serious Issues: ${report.summary.seriousIssues}`);
    console.log(`   ⚡ Moderate Issues: ${report.summary.moderateIssues}`);
    console.log(`   ℹ️  Minor Issues: ${report.summary.minorIssues}`);

    console.log('\n⌨️ KEYBOARD NAVIGATION:');
    console.log(`   Passed: ${report.keyboardNavigation.passed ? 'YES' : 'NO'}`);
    console.log(`   Focusable Elements: ${report.keyboardNavigation.focusableElements}`);
    if (report.keyboardNavigation.issues.length > 0) {
      console.log('   Issues:');
      report.keyboardNavigation.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }

    console.log('\n🎨 HIGH CONTRAST:');
    console.log(`   Supported: ${report.highContrast.supported ? 'YES' : 'NO'}`);
    console.log(`   Currently Enabled: ${report.highContrast.currentlyEnabled ? 'YES' : 'NO'}`);

    console.log('\n📱 SCREEN READER:');
    console.log(`   ARIA Tree Nodes: ${report.screenReader.ariaTreeNodes}`);
    console.log(`   Proper Structure: ${report.screenReader.hasProperStructure ? 'YES' : 'NO'}`);

    if (report.detailedIssues.length > 0) {
      console.log('\n🔍 DETAILED ISSUES:');
      report.detailedIssues.forEach((issue, index) => {
        const icon = issue.type === 'error' ? '🚨' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${index + 1}. ${icon} ${issue.description}`);
        console.log(`      Rule: ${issue.rule}`);
        console.log(`      Impact: ${issue.impact}`);
        console.log(`      WCAG: ${issue.wcagLevel} - ${issue.wcagCriteria}`);
        if (issue.selector) {
          console.log(`      Element: ${issue.selector}`);
        }
        console.log('');
      });
    }

    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    console.log('\n' + '='.repeat(60));
  }

  async saveReport(report: AccessibilityAuditReport, filename?: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const reportDir = path.join(process.cwd(), 'test-results', 'accessibility');
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportFile = filename || `accessibility-audit-${Date.now()}.json`;
    const reportPath = path.join(reportDir, reportFile);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
  }
}

// CLI runner
export async function runAccessibilityAudit(): Promise<void> {
  const runner = new AccessibilityAuditRunner();
  
  try {
    const report = await runner.runCompleteAudit();
    runner.printReport(report);
    await runner.saveReport(report);
    
    // Exit with error code if audit failed
    if (!report.passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Accessibility audit failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAccessibilityAudit();
}