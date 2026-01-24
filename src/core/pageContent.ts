/**
 * Enhanced page content extraction and processing
 * Provides intelligent text extraction, cleaning, and metadata extraction
 */

export interface PageContent {
  text: string;
  url: string;
  title: string;
  truncated: boolean;
  extractedAt: number;
  wordCount: number;
  readingTime: number; // in minutes
  language?: string;
  domain: string;
  metadata: {
    hasImages: boolean;
    hasVideos: boolean;
    hasLinks: number;
    hasTables: boolean;
    hasCode: boolean;
  };
}

export interface ContentExtractionOptions {
  maxLength?: number;
  includeMetadata?: boolean;
  cleanContent?: boolean;
  detectLanguage?: boolean;
}

// Cache for content extraction to avoid repeated processing
interface ContentCache {
  url: string;
  content: PageContent;
  timestamp: number;
}

let contentCache: ContentCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced JavaScript code for content extraction in webview
 * This runs in the context of the webpage being analyzed
 */
const CONTENT_EXTRACTION_SCRIPT = `
(function() {
  try {
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.advertisement', '.ad', '.ads', '.sidebar',
      '.menu', '.navigation', '.breadcrumb', '.social-share',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];
    
    const unwantedElements = document.querySelectorAll(unwantedSelectors.join(', '));
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = document.body.innerHTML;
    
    // Remove unwanted elements from temp container
    unwantedSelectors.forEach(selector => {
      const elements = tempContainer.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Extract main content
    let mainContent = '';
    const contentSelectors = [
      'main', 'article', '[role="main"]', '.content', '.post-content',
      '.entry-content', '.article-content', '.story-body', '.post-body'
    ];
    
    let mainElement = null;
    for (const selector of contentSelectors) {
      mainElement = tempContainer.querySelector(selector);
      if (mainElement) break;
    }
    
    // If no main content area found, use the whole body
    if (!mainElement) {
      mainElement = tempContainer;
    }
    
    // Extract text content
    mainContent = mainElement.innerText || mainElement.textContent || '';
    
    // Clean up the text
    mainContent = mainContent
      .replace(/\\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\\n\\s*\\n/g, '\\n\\n')  // Clean up line breaks
      .trim();
    
    // Extract metadata
    const images = document.querySelectorAll('img').length;
    const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
    const links = document.querySelectorAll('a[href]').length;
    const tables = document.querySelectorAll('table').length > 0;
    const codeBlocks = document.querySelectorAll('pre, code, .highlight').length > 0;
    
    // Detect language (simple heuristic)
    const lang = document.documentElement.lang || 
                 document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                 'en';
    
    return {
      text: mainContent,
      url: window.location.href,
      title: document.title || '',
      language: lang,
      metadata: {
        hasImages: images > 0,
        hasVideos: videos > 0,
        hasLinks: links,
        hasTables: tables,
        hasCode: codeBlocks
      }
    };
  } catch (error) {
    return {
      text: document.body ? document.body.innerText.slice(0, 8000) : '',
      url: window.location.href,
      title: document.title || '',
      language: 'en',
      metadata: {
        hasImages: false,
        hasVideos: false,
        hasLinks: 0,
        hasTables: false,
        hasCode: false
      }
    };
  }
})()
`;

/**
 * Calculate estimated reading time based on word count
 * Average reading speed: 200-250 words per minute
 */
function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 225; // Average reading speed
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Simple language detection based on common words
 */
function detectLanguage(text: string): string {
  const sample = text.toLowerCase().slice(0, 1000);
  
  // Common words in different languages
  const languagePatterns = {
    'en': ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'],
    'es': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no'],
    'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
    'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
    'it': ['il', 'di', 'che', 'e', 'la', 'per', 'in', 'un', 'è', 'con'],
    'pt': ['o', 'de', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com'],
    'ru': ['в', 'и', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а'],
    'zh': ['的', '一', '是', '在', '不', '了', '有', '和', '人', '这'],
    'ja': ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し'],
    'ar': ['في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'التي', 'الذي', 'كان', 'أن']
  };
  
  let maxScore = 0;
  let detectedLang = 'en';
  
  for (const [lang, words] of Object.entries(languagePatterns)) {
    let score = 0;
    for (const word of words) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = sample.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }
  
  return detectedLang;
}

/**
 * Enhanced page content extraction with cleaning and metadata
 */
export async function extractPageContent(
  options: ContentExtractionOptions = {}
): Promise<PageContent | null> {
  const {
    maxLength = 8000,
    includeMetadata = true,
    cleanContent = true,
    detectLanguage: shouldDetectLanguage = true
  } = options;

  try {
    // Check if window.arc is available
    if (typeof window === 'undefined' || !window.arc || !window.arc.getCurrentPageText) {
      throw new Error('Page content extraction not available');
    }

    // Get current tab info for URL
    const currentTab = await window.arc.getCurrentTab();
    const currentUrl = currentTab?.url || 'unknown';

    // Check cache first
    if (contentCache && 
        contentCache.url === currentUrl && 
        Date.now() - contentCache.timestamp < CACHE_TTL) {
      console.log('📄 [PageContent] Using cached content');
      return contentCache.content;
    }

    // Get enhanced page content
    const result = await window.arc.getCurrentPageText();
    
    if (!result.ok || !result.text) {
      throw new Error(result.error || 'Failed to extract page content');
    }

    let text = result.text.trim();
    
    if (!text) {
      return null;
    }

    // Apply length limit
    const truncated = text.length > maxLength;
    if (truncated) {
      text = text.slice(0, maxLength);
      // Try to end at a sentence boundary
      const lastSentence = text.lastIndexOf('.');
      if (lastSentence > maxLength * 0.8) {
        text = text.slice(0, lastSentence + 1);
      }
    }

    // Calculate metadata
    const wordCount = countWords(text);
    const readingTime = calculateReadingTime(wordCount);
    const domain = extractDomain(currentUrl);
    const language = shouldDetectLanguage ? detectLanguage(text) : undefined;

    const pageContent: PageContent = {
      text,
      url: currentUrl,
      title: currentTab?.title || 'Untitled',
      truncated,
      extractedAt: Date.now(),
      wordCount,
      readingTime,
      language,
      domain,
      metadata: {
        hasImages: false,
        hasVideos: false,
        hasLinks: 0,
        hasTables: false,
        hasCode: false
      }
    };

    // Cache the result
    contentCache = {
      url: currentUrl,
      content: pageContent,
      timestamp: Date.now()
    };

    console.log('📄 [PageContent] Extracted content:', {
      url: currentUrl,
      wordCount,
      readingTime,
      language,
      truncated
    });

    return pageContent;

  } catch (error) {
    console.error('Error extracting page content:', error);
    return null;
  }
}

/**
 * Get cached page content if available
 */
export function getCachedPageContent(): PageContent | null {
  if (contentCache && Date.now() - contentCache.timestamp < CACHE_TTL) {
    return contentCache.content;
  }
  return null;
}

/**
 * Clear the content cache
 */
export function clearContentCache(): void {
  contentCache = null;
}

/**
 * Check if content extraction is available
 */
export function isContentExtractionAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.arc && 
         typeof window.arc.getCurrentPageText === 'function';
}

/**
 * Extract content for summarization (optimized for AI processing)
 */
export async function extractContentForSummarization(): Promise<PageContent | null> {
  return extractPageContent({
    maxLength: 12000, // Longer for better summarization
    includeMetadata: true,
    cleanContent: true,
    detectLanguage: true
  });
}

/**
 * Extract content for translation (with language detection)
 */
export async function extractContentForTranslation(): Promise<PageContent | null> {
  return extractPageContent({
    maxLength: 10000,
    includeMetadata: false,
    cleanContent: true,
    detectLanguage: true
  });
}

/**
 * Get content summary statistics
 */
export function getContentStats(content: PageContent): {
  readingTimeFormatted: string;
  wordCountFormatted: string;
  contentType: string;
} {
  const readingTimeFormatted = content.readingTime === 1 
    ? '1 minute read' 
    : `${content.readingTime} minutes read`;
    
  const wordCountFormatted = content.wordCount.toLocaleString() + ' words';
  
  let contentType = 'Article';
  if (content.metadata.hasCode) contentType = 'Technical Content';
  else if (content.metadata.hasTables) contentType = 'Data/Report';
  else if (content.metadata.hasVideos) contentType = 'Media Content';
  else if (content.wordCount < 300) contentType = 'Short Article';
  else if (content.wordCount > 2000) contentType = 'Long Article';
  
  return {
    readingTimeFormatted,
    wordCountFormatted,
    contentType
  };
}