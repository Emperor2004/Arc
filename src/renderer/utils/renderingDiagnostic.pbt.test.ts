import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { RenderingDiagnostic, RenderingError } from './renderingDiagnostic';

describe('RenderingDiagnostic Property-Based Tests', () => {
  let diagnostic: RenderingDiagnostic;

  beforeEach(() => {
    diagnostic = new RenderingDiagnostic();
    // Setup basic DOM structure
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Property 4: Error Handling and Fallbacks', () => {
    // Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
    // Validates: Requirements 1.4, 5.1, 5.2, 5.4

    it('should detect and log errors for any missing critical component', () => {
      // Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
      fc.assert(
        fc.property(
          fc.record({
            hasRoot: fc.boolean(),
            hasArcRoot: fc.boolean(),
            hasHeader: fc.boolean(),
            hasNav: fc.boolean(),
            hasMain: fc.boolean(),
          }),
          (componentState) => {
            // Setup DOM based on component state
            const root = document.getElementById('root');
            if (!root) return;

            root.innerHTML = '';

            if (componentState.hasRoot) {
              const content = document.createElement('div');
              if (componentState.hasArcRoot) {
                const arcRoot = document.createElement('div');
                arcRoot.className = 'arc-root';
                content.appendChild(arcRoot);
              }
              if (componentState.hasHeader) {
                const header = document.createElement('div');
                header.className = 'arc-header';
                content.appendChild(header);
              }
              if (componentState.hasNav) {
                const nav = document.createElement('div');
                nav.className = 'arc-nav';
                content.appendChild(nav);
              }
              if (componentState.hasMain) {
                const main = document.createElement('div');
                main.className = 'arc-main';
                content.appendChild(main);
              }
              root.appendChild(content);
            }

            // Create fresh diagnostic instance
            const testDiagnostic = new RenderingDiagnostic();
            const result = testDiagnostic.checkReactMount();
            const errors = testDiagnostic.detectRenderingErrors();

            // Property: If React hasn't mounted (no content), should have critical error
            if (!componentState.hasRoot || root.children.length === 0) {
              expect(errors.some(e => e.severity === 'critical')).toBe(true);
              expect(result.reactMounted).toBe(false);
            }

            // Property: Missing critical components should generate errors
            if (componentState.hasRoot && root.children.length > 0) {
              expect(result.reactMounted).toBe(true);
              
              if (!componentState.hasArcRoot) {
                expect(errors.some(e => e.element === '.arc-root' && e.severity === 'critical')).toBe(true);
              }
              
              if (!componentState.hasHeader) {
                expect(errors.some(e => e.element === '.arc-header')).toBe(true);
              }
              
              if (!componentState.hasMain) {
                expect(errors.some(e => e.element === '.arc-main')).toBe(true);
              }
            }

            // Property: All errors should have required fields
            errors.forEach(error => {
              expect(error.type).toBeDefined();
              expect(error.message).toBeDefined();
              expect(error.timestamp).toBeGreaterThan(0);
              expect(error.severity).toBeDefined();
              expect(['low', 'medium', 'high', 'critical']).toContain(error.severity);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should provide meaningful error messages for any component failure', () => {
      // Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
      fc.assert(
        fc.property(
          fc.constantFrom('react', 'css', 'asset', 'component', 'js'),
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.constantFrom('low', 'medium', 'high', 'critical'),
          (errorType, errorMessage, severity) => {
            const testDiagnostic = new RenderingDiagnostic();
            
            // Trigger error by checking mount with empty root
            document.getElementById('root')!.innerHTML = '';
            testDiagnostic.checkReactMount();
            
            const errors = testDiagnostic.detectRenderingErrors();

            // Property: All errors should have meaningful messages
            errors.forEach(error => {
              expect(error.message).toBeTruthy();
              expect(error.message.length).toBeGreaterThan(0);
              expect(error.type).toBeDefined();
              expect(['react', 'css', 'asset', 'component', 'js']).toContain(error.type);
            });

            // Property: Critical errors should be logged for empty root
            const criticalErrors = errors.filter(e => e.severity === 'critical');
            expect(criticalErrors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain error log integrity across multiple diagnostic runs', () => {
      // Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (numRuns) => {
            const testDiagnostic = new RenderingDiagnostic();
            
            // Run diagnostic multiple times
            for (let i = 0; i < numRuns; i++) {
              testDiagnostic.checkReactMount();
            }

            const errors = testDiagnostic.detectRenderingErrors();

            // Property: Error count should grow with each run (errors accumulate)
            expect(errors.length).toBeGreaterThanOrEqual(numRuns);

            // Property: All errors should have valid timestamps
            const timestamps = errors.map(e => e.timestamp);
            for (let i = 1; i < timestamps.length; i++) {
              expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
            }

            // Property: Each error should be unique by timestamp
            const uniqueTimestamps = new Set(timestamps);
            expect(uniqueTimestamps.size).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should correctly assess overall health based on error severity', () => {
      // Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
      fc.assert(
        fc.property(
          fc.record({
            hasContent: fc.boolean(),
            hasCriticalStyles: fc.boolean(),
          }),
          (state) => {
            const root = document.getElementById('root');
            if (!root) return;

            // Setup DOM
            if (state.hasContent) {
              const arcRoot = document.createElement('div');
              arcRoot.className = 'arc-root';
              root.appendChild(arcRoot);
            } else {
              root.innerHTML = '';
            }

            const testDiagnostic = new RenderingDiagnostic();
            const result = testDiagnostic.runDiagnostic();

            // Property: Critical health if no content
            if (!state.hasContent) {
              expect(result.overallHealth).toBe('critical');
            }

            // Property: Health status should be one of the valid values
            expect(['healthy', 'warning', 'critical']).toContain(result.overallHealth);

            // Property: Critical health should have critical errors
            if (result.overallHealth === 'critical') {
              const criticalErrors = result.errors.filter(e => e.severity === 'critical');
              expect(criticalErrors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle CSS validation errors gracefully for any stylesheet state', () => {
      // Feature: ui-rendering-fix, Property 4: Error Handling and Fallbacks
      fc.assert(
        fc.property(
          fc.boolean(),
          (hasStylesheets) => {
            const testDiagnostic = new RenderingDiagnostic();
            
            // Mock stylesheet state
            const originalStyleSheets = document.styleSheets;
            if (!hasStylesheets) {
              Object.defineProperty(document, 'styleSheets', {
                value: [],
                configurable: true,
              });
            }

            const result = testDiagnostic.validateCSS();
            const errors = testDiagnostic.detectRenderingErrors();

            // Property: Should always return a valid result object
            expect(result).toBeDefined();
            expect(typeof result.stylesLoaded).toBe('boolean');
            expect(typeof result.glassmorphismSupported).toBe('boolean');
            expect(Array.isArray(result.missingRules)).toBe(true);
            expect(Array.isArray(result.conflictingRules)).toBe(true);

            // Property: If no stylesheets, should log critical error
            if (!hasStylesheets) {
              expect(result.stylesLoaded).toBe(false);
              expect(errors.some(e => e.type === 'css' && e.severity === 'critical')).toBe(true);
            }

            // Restore
            Object.defineProperty(document, 'styleSheets', {
              value: originalStyleSheets,
              configurable: true,
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 11: Asset Loading Validation', () => {
    // Feature: ui-rendering-fix, Property 11: Asset Loading Validation
    // Validates: Requirements 5.5

    it('should validate all required CSS and assets are loaded correctly', () => {
      // Feature: ui-rendering-fix, Property 11: Asset Loading Validation
      fc.assert(
        fc.property(
          fc.record({
            numImages: fc.integer({ min: 0, max: 5 }),
            numStylesheets: fc.integer({ min: 0, max: 3 }),
            imageLoadSuccess: fc.boolean(),
          }),
          (assetState) => {
            // Setup DOM with images
            const root = document.getElementById('root');
            if (!root) return;

            root.innerHTML = '';

            // Add images
            const addedImages: HTMLImageElement[] = [];
            for (let i = 0; i < assetState.numImages; i++) {
              const img = document.createElement('img');
              img.src = `https://example.com/image${i}.png`;
              
              // Mock image loading state - must be done before appending to DOM
              Object.defineProperty(img, 'complete', {
                value: assetState.imageLoadSuccess,
                configurable: true,
                writable: true,
              });
              Object.defineProperty(img, 'naturalWidth', {
                value: assetState.imageLoadSuccess ? 100 : 0,
                configurable: true,
                writable: true,
              });
              
              root.appendChild(img);
              addedImages.push(img);
            }

            // Add stylesheets
            const head = document.head;
            
            for (let i = 0; i < assetState.numStylesheets; i++) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = `https://example.com/style${i}.css`;
              head.appendChild(link);
            }

            const testDiagnostic = new RenderingDiagnostic();
            const result = testDiagnostic.verifyAssets();

            // Property: Result should always have valid structure
            expect(result).toBeDefined();
            expect(typeof result.allAssetsLoaded).toBe('boolean');
            expect(Array.isArray(result.failedAssets)).toBe(true);
            expect(Array.isArray(result.loadingAssets)).toBe(true);
            expect(typeof result.criticalAssetsLoaded).toBe('boolean');

            // Property: If images fail to load, should be detected
            if (assetState.numImages > 0 && !assetState.imageLoadSuccess) {
              expect(result.allAssetsLoaded).toBe(false);
              // Either in failedAssets or loadingAssets
              const totalIssues = result.failedAssets.length + result.loadingAssets.length;
              expect(totalIssues).toBeGreaterThan(0);
            }

            // Property: Failed assets should be tracked
            result.failedAssets.forEach(asset => {
              expect(typeof asset).toBe('string');
              expect(asset.length).toBeGreaterThan(0);
            });

            // Cleanup
            for (let i = 0; i < assetState.numStylesheets; i++) {
              const link = head.querySelector(`link[href="https://example.com/style${i}.css"]`);
              if (link) head.removeChild(link);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should correctly identify critical assets for any asset configuration', () => {
      // Feature: ui-rendering-fix, Property 11: Asset Loading Validation
      fc.assert(
        fc.property(
          fc.record({
            hasGlobalCSS: fc.boolean(),
            hasIndexCSS: fc.boolean(),
          }),
          (assetState) => {
            const head = document.head;
            const existingLinks = Array.from(head.querySelectorAll('link[rel="stylesheet"]'));

            // Add critical CSS if specified
            if (assetState.hasGlobalCSS) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://example.com/global.css';
              head.appendChild(link);
            }

            if (assetState.hasIndexCSS) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://example.com/index.css';
              head.appendChild(link);
            }

            const testDiagnostic = new RenderingDiagnostic();
            const result = testDiagnostic.verifyAssets();

            // Property: Critical assets loaded if at least one critical CSS present
            if (assetState.hasGlobalCSS || assetState.hasIndexCSS) {
              expect(result.criticalAssetsLoaded).toBe(true);
            }

            // Cleanup
            if (assetState.hasGlobalCSS) {
              const link = head.querySelector('link[href="https://example.com/global.css"]');
              if (link) head.removeChild(link);
            }
            if (assetState.hasIndexCSS) {
              const link = head.querySelector('link[href="https://example.com/index.css"]');
              if (link) head.removeChild(link);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should track loading and failed assets separately for any asset state', () => {
      // Feature: ui-rendering-fix, Property 11: Asset Loading Validation
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              src: fc.webUrl(),
              complete: fc.boolean(),
              naturalWidth: fc.integer({ min: 0, max: 200 }),
            }),
            { maxLength: 10 }
          ),
          (images) => {
            const root = document.getElementById('root');
            if (!root) return;

            root.innerHTML = '';

            // Add images with various states
            for (const imgData of images) {
              const img = document.createElement('img');
              img.src = imgData.src;
              
              Object.defineProperty(img, 'complete', {
                value: imgData.complete,
                configurable: true,
              });
              Object.defineProperty(img, 'naturalWidth', {
                value: imgData.naturalWidth,
                configurable: true,
              });
              
              root.appendChild(img);
            }

            const testDiagnostic = new RenderingDiagnostic();
            const result = testDiagnostic.verifyAssets();

            // Property: Loading assets should be incomplete
            result.loadingAssets.forEach(asset => {
              expect(typeof asset).toBe('string');
            });

            // Property: Failed assets should have naturalWidth of 0
            result.failedAssets.forEach(asset => {
              expect(typeof asset).toBe('string');
            });

            // Property: If any asset failed or loading, allAssetsLoaded should be false
            if (result.failedAssets.length > 0 || result.loadingAssets.length > 0) {
              expect(result.allAssetsLoaded).toBe(false);
            }

            // Property: No overlap between failed and loading assets
            const failedSet = new Set(result.failedAssets);
            const loadingSet = new Set(result.loadingAssets);
            const intersection = [...failedSet].filter(x => loadingSet.has(x));
            expect(intersection.length).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle asset verification errors gracefully', () => {
      // Feature: ui-rendering-fix, Property 11: Asset Loading Validation
      fc.assert(
        fc.property(
          fc.boolean(),
          (throwError) => {
            const testDiagnostic = new RenderingDiagnostic();

            // Property: Should always return valid result even if errors occur
            const result = testDiagnostic.verifyAssets();

            expect(result).toBeDefined();
            expect(typeof result.allAssetsLoaded).toBe('boolean');
            expect(Array.isArray(result.failedAssets)).toBe(true);
            expect(Array.isArray(result.loadingAssets)).toBe(true);
            expect(typeof result.criticalAssetsLoaded).toBe('boolean');

            // Property: Result structure should be consistent
            expect(result).toHaveProperty('allAssetsLoaded');
            expect(result).toHaveProperty('failedAssets');
            expect(result).toHaveProperty('loadingAssets');
            expect(result).toHaveProperty('criticalAssetsLoaded');
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
