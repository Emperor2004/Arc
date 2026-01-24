/**
 * Content Summarization Pipeline
 * Provides AI-powered summarization using Ollama integration
 */

import { getOllamaClient, OllamaError, OllamaErrorType } from './ollamaClient';
import { extractContentForSummarization, PageContent } from './pageContent';

export interface SummaryOptions {
  type: 'short' | 'bullets' | 'insights' | 'detailed';
  maxLength?: number;
  includeKeywords?: boolean;
  includeTopics?: boolean;
}

export interface SummaryResult {
  summary: string;
  type: string;
  wordCount: number;
  keyInsights?: string[];
  topics?: string[];
  keywords?: string[];
  readingTime: number; // in minutes
  confidence: number; // 0-1 score
  generatedAt: number;
  sourceUrl: string;
  sourceTitle: string;
  sourceWordCount: number;
  sourceReadingTime: number;
}

export interface SummaryError {
  error: string;
  type: 'content_extraction' | 'ollama_unavailable' | 'processing_failed' | 'unknown';
  details?: any;
}

// Cache for summaries to avoid repeated processing
interface SummaryCache {
  url: string;
  contentHash: string;
  summaries: Map<string, SummaryResult>;
  timestamp: number;
}

let summaryCache: SummaryCache | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a simple hash for content to detect changes
 */
function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get cache key for summary options
 */
function getSummaryCacheKey(options: SummaryOptions): string {
  return `${options.type}_${options.maxLength || 'default'}_${options.includeKeywords || false}_${options.includeTopics || false}`;
}

/**
 * Create prompts for different summary types
 */
function createSummaryPrompt(content: PageContent, options: SummaryOptions): string {
  const baseContext = `Article Title: ${content.title}
URL: ${content.url}
Word Count: ${content.wordCount}
Reading Time: ${content.readingTime} minutes
Language: ${content.language || 'en'}

Content:
${content.text}

---`;

  switch (options.type) {
    case 'short':
      return `${baseContext}

Please provide a concise 1-2 sentence summary of this article. Focus on the main point or conclusion.

Summary:`;

    case 'bullets':
      return `${baseContext}

Please provide a bullet-point summary of this article with 3-5 key points. Each bullet should be concise and capture important information.

Key Points:
•`;

    case 'insights':
      return `${baseContext}

Please analyze this article and provide:
1. A brief summary (2-3 sentences)
2. 2-3 key insights or takeaways
3. Main topics covered${options.includeKeywords ? '\n4. Important keywords' : ''}

Analysis:`;

    case 'detailed':
      return `${baseContext}

Please provide a comprehensive summary of this article including:
1. Main thesis or argument (2-3 sentences)
2. Key supporting points (3-5 bullets)
3. Important details or data mentioned
4. Conclusion or implications${options.includeTopics ? '\n5. Main topics and themes' : ''}${options.includeKeywords ? '\n6. Important keywords and terms' : ''}

Detailed Summary:`;

    default:
      return createSummaryPrompt(content, { ...options, type: 'short' });
  }
}

/**
 * Parse summary response to extract structured data
 */
function parseSummaryResponse(response: string, options: SummaryOptions): {
  summary: string;
  keyInsights?: string[];
  topics?: string[];
  keywords?: string[];
} {
  const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let summary = '';
  const keyInsights: string[] = [];
  const topics: string[] = [];
  const keywords: string[] = [];
  
  let currentSection = 'summary';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect section headers
    if (lowerLine.includes('key points') || lowerLine.includes('insights') || lowerLine.includes('takeaways')) {
      currentSection = 'insights';
      continue;
    } else if (lowerLine.includes('topics') || lowerLine.includes('themes')) {
      currentSection = 'topics';
      continue;
    } else if (lowerLine.includes('keywords') || lowerLine.includes('terms')) {
      currentSection = 'keywords';
      continue;
    }
    
    // Process content based on current section
    if (currentSection === 'summary') {
      if (summary) summary += ' ';
      summary += line;
    } else if (currentSection === 'insights') {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
        keyInsights.push(line.replace(/^[•\-*\d\.]\s*/, ''));
      } else if (line.length > 10) {
        keyInsights.push(line);
      }
    } else if (currentSection === 'topics') {
      if (line.includes(',')) {
        topics.push(...line.split(',').map(t => t.trim()));
      } else {
        topics.push(line);
      }
    } else if (currentSection === 'keywords') {
      if (line.includes(',')) {
        keywords.push(...line.split(',').map(k => k.trim()));
      } else {
        keywords.push(line);
      }
    }
  }
  
  return {
    summary: summary.trim(),
    keyInsights: keyInsights.length > 0 ? keyInsights : undefined,
    topics: topics.length > 0 ? topics : undefined,
    keywords: keywords.length > 0 ? keywords : undefined
  };
}

/**
 * Calculate confidence score based on content and summary quality
 */
function calculateConfidence(content: PageContent, summary: string): number {
  let confidence = 0.5; // Base confidence
  
  // Boost confidence for longer, well-structured content
  if (content.wordCount > 500) confidence += 0.1;
  if (content.wordCount > 1000) confidence += 0.1;
  
  // Boost for content with good structure
  if (content.metadata.hasTables) confidence += 0.05;
  if (content.metadata.hasLinks > 5) confidence += 0.05;
  
  // Boost for reasonable summary length
  const summaryWords = summary.split(/\s+/).length;
  const compressionRatio = summaryWords / content.wordCount;
  if (compressionRatio > 0.05 && compressionRatio < 0.3) confidence += 0.1;
  
  // Penalize very short summaries
  if (summaryWords < 10) confidence -= 0.2;
  
  // Penalize if summary seems incomplete
  if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
    confidence -= 0.1;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Summarize current page content
 */
export async function summarizeCurrentPage(options: SummaryOptions = { type: 'short' }): Promise<SummaryResult | SummaryError> {
  try {
    console.log('📝 [Summarization] Starting page summarization with options:', options);
    
    // Extract page content
    const content = await extractContentForSummarization();
    if (!content) {
      return {
        error: 'Failed to extract page content',
        type: 'content_extraction'
      };
    }
    
    console.log('📝 [Summarization] Extracted content:', {
      url: content.url,
      wordCount: content.wordCount,
      readingTime: content.readingTime,
      language: content.language
    });
    
    // Check cache
    const contentHash = generateContentHash(content.text);
    const cacheKey = getSummaryCacheKey(options);
    
    if (summaryCache && 
        summaryCache.url === content.url && 
        summaryCache.contentHash === contentHash &&
        Date.now() - summaryCache.timestamp < CACHE_TTL) {
      
      const cachedSummary = summaryCache.summaries.get(cacheKey);
      if (cachedSummary) {
        console.log('📝 [Summarization] Using cached summary');
        return cachedSummary;
      }
    }
    
    // Get Ollama client and check availability
    const ollamaClient = getOllamaClient();
    const status = await ollamaClient.getStatus();
    
    if (!status.available) {
      return {
        error: 'Ollama is not running. Start it with: ollama serve',
        type: 'ollama_unavailable'
      };
    }
    
    if (!status.hasModels) {
      return {
        error: 'No models installed. Install one with: ollama pull llama3',
        type: 'ollama_unavailable'
      };
    }
    
    // Select model (prefer llama3 for summarization)
    const availableModels = status.models.map(m => m.name);
    let selectedModel = 'llama3:latest';
    
    if (!availableModels.some(m => m.includes('llama3'))) {
      selectedModel = availableModels[0]; // Use first available model
    }
    
    console.log('📝 [Summarization] Using model:', selectedModel);
    
    // Create prompt
    const prompt = createSummaryPrompt(content, options);
    console.log('📝 [Summarization] Generated prompt length:', prompt.length);
    
    // Generate summary
    const startTime = Date.now();
    const response = await ollamaClient.generate({
      model: selectedModel,
      prompt,
      options: {
        temperature: 0.3, // Lower temperature for more focused summaries
        top_p: 0.9
      }
    });
    
    const processingTime = Date.now() - startTime;
    console.log('📝 [Summarization] Generated summary in', processingTime, 'ms');
    
    // Parse response
    const parsed = parseSummaryResponse(response, options);
    
    if (!parsed.summary || parsed.summary.length < 10) {
      return {
        error: 'Generated summary is too short or empty',
        type: 'processing_failed',
        details: { response: response.substring(0, 200) }
      };
    }
    
    // Calculate metadata
    const summaryWordCount = parsed.summary.split(/\s+/).length;
    const summaryReadingTime = Math.ceil(summaryWordCount / 225);
    const confidence = calculateConfidence(content, parsed.summary);
    
    const result: SummaryResult = {
      summary: parsed.summary,
      type: options.type,
      wordCount: summaryWordCount,
      keyInsights: parsed.keyInsights,
      topics: parsed.topics,
      keywords: parsed.keywords,
      readingTime: summaryReadingTime,
      confidence,
      generatedAt: Date.now(),
      sourceUrl: content.url,
      sourceTitle: content.title,
      sourceWordCount: content.wordCount,
      sourceReadingTime: content.readingTime
    };
    
    // Update cache
    if (!summaryCache || summaryCache.url !== content.url || summaryCache.contentHash !== contentHash) {
      summaryCache = {
        url: content.url,
        contentHash,
        summaries: new Map(),
        timestamp: Date.now()
      };
    }
    summaryCache.summaries.set(cacheKey, result);
    
    console.log('📝 [Summarization] Summary generated successfully:', {
      type: result.type,
      wordCount: result.wordCount,
      confidence: result.confidence,
      hasInsights: !!result.keyInsights,
      hasTopics: !!result.topics,
      hasKeywords: !!result.keywords
    });
    
    return result;
    
  } catch (error) {
    console.error('📝 [Summarization] Error:', error);
    
    if (error instanceof OllamaError) {
      return {
        error: error.message,
        type: 'ollama_unavailable',
        details: { ollamaErrorType: error.type }
      };
    }
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      type: 'unknown',
      details: error
    };
  }
}

/**
 * Summarize provided text content
 */
export async function summarizeText(
  text: string, 
  metadata: { title?: string; url?: string; language?: string } = {},
  options: SummaryOptions = { type: 'short' }
): Promise<SummaryResult | SummaryError> {
  try {
    console.log('📝 [Summarization] Summarizing provided text:', {
      textLength: text.length,
      title: metadata.title,
      url: metadata.url,
      options
    });
    
    // Create mock PageContent object
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 225);
    
    const content: PageContent = {
      text: text.trim(),
      url: metadata.url || 'provided-text',
      title: metadata.title || 'Provided Text',
      truncated: false,
      extractedAt: Date.now(),
      wordCount,
      readingTime,
      language: metadata.language || 'en',
      domain: 'unknown',
      metadata: {
        hasImages: false,
        hasVideos: false,
        hasLinks: 0,
        hasTables: false,
        hasCode: false
      }
    };
    
    // Use the same logic as summarizeCurrentPage but with provided content
    const contentHash = generateContentHash(content.text);
    const cacheKey = getSummaryCacheKey(options);
    
    // Check cache (if URL is provided)
    if (metadata.url && summaryCache && 
        summaryCache.url === content.url && 
        summaryCache.contentHash === contentHash &&
        Date.now() - summaryCache.timestamp < CACHE_TTL) {
      
      const cachedSummary = summaryCache.summaries.get(cacheKey);
      if (cachedSummary) {
        console.log('📝 [Summarization] Using cached summary for provided text');
        return cachedSummary;
      }
    }
    
    // Get Ollama client and check availability
    const ollamaClient = getOllamaClient();
    const status = await ollamaClient.getStatus();
    
    if (!status.available) {
      return {
        error: 'Ollama is not running. Start it with: ollama serve',
        type: 'ollama_unavailable'
      };
    }
    
    if (!status.hasModels) {
      return {
        error: 'No models installed. Install one with: ollama pull llama3',
        type: 'ollama_unavailable'
      };
    }
    
    // Select model
    const availableModels = status.models.map(m => m.name);
    let selectedModel = 'llama3:latest';
    
    if (!availableModels.some(m => m.includes('llama3'))) {
      selectedModel = availableModels[0];
    }
    
    // Create prompt and generate summary
    const prompt = createSummaryPrompt(content, options);
    const response = await ollamaClient.generate({
      model: selectedModel,
      prompt,
      options: {
        temperature: 0.3,
        top_p: 0.9
      }
    });
    
    // Parse and return result
    const parsed = parseSummaryResponse(response, options);
    
    if (!parsed.summary || parsed.summary.length < 10) {
      return {
        error: 'Generated summary is too short or empty',
        type: 'processing_failed',
        details: { response: response.substring(0, 200) }
      };
    }
    
    const summaryWordCount = parsed.summary.split(/\s+/).length;
    const summaryReadingTime = Math.ceil(summaryWordCount / 225);
    const confidence = calculateConfidence(content, parsed.summary);
    
    const result: SummaryResult = {
      summary: parsed.summary,
      type: options.type,
      wordCount: summaryWordCount,
      keyInsights: parsed.keyInsights,
      topics: parsed.topics,
      keywords: parsed.keywords,
      readingTime: summaryReadingTime,
      confidence,
      generatedAt: Date.now(),
      sourceUrl: content.url,
      sourceTitle: content.title,
      sourceWordCount: content.wordCount,
      sourceReadingTime: content.readingTime
    };
    
    // Update cache if URL provided
    if (metadata.url) {
      if (!summaryCache || summaryCache.url !== content.url || summaryCache.contentHash !== contentHash) {
        summaryCache = {
          url: content.url,
          contentHash,
          summaries: new Map(),
          timestamp: Date.now()
        };
      }
      summaryCache.summaries.set(cacheKey, result);
    }
    
    console.log('📝 [Summarization] Text summary generated successfully');
    return result;
    
  } catch (error) {
    console.error('📝 [Summarization] Error summarizing text:', error);
    
    if (error instanceof OllamaError) {
      return {
        error: error.message,
        type: 'ollama_unavailable',
        details: { ollamaErrorType: error.type }
      };
    }
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      type: 'unknown',
      details: error
    };
  }
}

/**
 * Get available summary types with descriptions
 */
export function getSummaryTypes(): Array<{ type: SummaryOptions['type']; name: string; description: string }> {
  return [
    {
      type: 'short',
      name: 'Quick Summary',
      description: 'A concise 1-2 sentence overview of the main point'
    },
    {
      type: 'bullets',
      name: 'Key Points',
      description: 'Important information organized as bullet points'
    },
    {
      type: 'insights',
      name: 'Key Insights',
      description: 'Summary with key takeaways and insights'
    },
    {
      type: 'detailed',
      name: 'Detailed Analysis',
      description: 'Comprehensive summary with supporting points and implications'
    }
  ];
}

/**
 * Clear the summary cache
 */
export function clearSummaryCache(): void {
  summaryCache = null;
  console.log('📝 [Summarization] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getSummaryCacheStats(): { 
  hasCache: boolean; 
  url?: string; 
  summaryCount: number; 
  ageMinutes: number; 
} {
  if (!summaryCache) {
    return { hasCache: false, summaryCount: 0, ageMinutes: 0 };
  }
  
  const ageMinutes = Math.floor((Date.now() - summaryCache.timestamp) / (60 * 1000));
  
  return {
    hasCache: true,
    url: summaryCache.url,
    summaryCount: summaryCache.summaries.size,
    ageMinutes
  };
}