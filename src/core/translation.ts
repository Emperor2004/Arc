/**
 * Translation Services Core System
 * Provides language detection and translation capabilities using Ollama
 */

import { getOllamaClient } from './ollamaClient';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  translatedAt: number;
  wordCount: number;
  translationTime: number; // in milliseconds
}

export interface TranslationError {
  error: string;
  code: 'OLLAMA_UNAVAILABLE' | 'LANGUAGE_DETECTION_FAILED' | 'TRANSLATION_FAILED' | 'UNSUPPORTED_LANGUAGE' | 'TEXT_TOO_LONG';
  originalText: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  detectedAt: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  popular: boolean;
}

// Supported languages for translation
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', popular: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', popular: true },
  { code: 'fr', name: 'French', nativeName: 'Français', popular: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', popular: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', popular: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', popular: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', popular: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', popular: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', popular: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', popular: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', popular: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', popular: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', popular: false },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', popular: false },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', popular: false },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', popular: false },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', popular: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', popular: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', popular: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', popular: false }
];

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, TranslationResult>();
const languageDetectionCache = new Map<string, LanguageDetectionResult>();

// Cache settings
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;
const MAX_TEXT_LENGTH = 10000; // Maximum text length for translation

/**
 * Generate cache key for translation
 */
function getTranslationCacheKey(text: string, targetLanguage: string, sourceLanguage?: string): string {
  const source = sourceLanguage || 'auto';
  return `${source}->${targetLanguage}:${text.substring(0, 100)}`;
}

/**
 * Generate cache key for language detection
 */
function getLanguageDetectionCacheKey(text: string): string {
  return `detect:${text.substring(0, 100)}`;
}

/**
 * Clean expired entries from cache
 */
function cleanCache(): void {
  const now = Date.now();
  
  // Clean translation cache
  for (const [key, result] of translationCache.entries()) {
    if (now - result.translatedAt > CACHE_EXPIRY_MS) {
      translationCache.delete(key);
    }
  }
  
  // Clean language detection cache
  for (const [key, result] of languageDetectionCache.entries()) {
    if (now - result.detectedAt > CACHE_EXPIRY_MS) {
      languageDetectionCache.delete(key);
    }
  }
  
  // Limit cache size
  if (translationCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(translationCache.entries());
    entries.sort((a, b) => a[1].translatedAt - b[1].translatedAt);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => translationCache.delete(key));
  }
  
  if (languageDetectionCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(languageDetectionCache.entries());
    entries.sort((a, b) => a[1].detectedAt - b[1].detectedAt);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => languageDetectionCache.delete(key));
  }
}

/**
 * Detect the language of given text using LLM
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult | TranslationError> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        error: 'Text is empty',
        code: 'LANGUAGE_DETECTION_FAILED',
        originalText: text
      };
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return {
        error: `Text is too long (${text.length} characters, max ${MAX_TEXT_LENGTH})`,
        code: 'TEXT_TOO_LONG',
        originalText: text
      };
    }
    
    // Check cache first
    const cacheKey = getLanguageDetectionCacheKey(text);
    const cached = languageDetectionCache.get(cacheKey);
    if (cached && Date.now() - cached.detectedAt < CACHE_EXPIRY_MS) {
      console.log('🌐 [Translation] Language detection cache hit');
      return cached;
    }
    
    // Clean cache periodically
    if (Math.random() < 0.1) {
      cleanCache();
    }
    
    console.log('🌐 [Translation] Detecting language for text:', text.substring(0, 100) + '...');
    
    const startTime = Date.now();
    
    // Use a sample of text for detection (first 500 characters)
    const sampleText = text.substring(0, 500);
    
    const prompt = `Detect the language of the following text. Respond with only the ISO 639-1 language code (e.g., "en", "es", "fr", "de", etc.). If you're not sure, respond with "unknown".

Text: "${sampleText}"

Language code:`;
    
    const response = await getOllamaClient().chat({
      model: 'llama3:latest',
      messages: [{ role: 'user', content: prompt }]
    });
    
    if (!response || typeof response !== 'string') {
      return {
        error: 'No response from language detection service',
        code: 'LANGUAGE_DETECTION_FAILED',
        originalText: text
      };
    }
    
    const detectedCode = response.trim().toLowerCase();
    
    // Validate detected language code
    const supportedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === detectedCode);
    if (!supportedLanguage && detectedCode !== 'unknown') {
      console.warn('🌐 [Translation] Detected unsupported language:', detectedCode);
    }
    
    const result: LanguageDetectionResult = {
      language: supportedLanguage ? detectedCode : 'unknown',
      confidence: supportedLanguage ? 0.8 : 0.3, // Lower confidence for unknown languages
      detectedAt: Date.now()
    };
    
    // Cache the result
    languageDetectionCache.set(cacheKey, result);
    
    const detectionTime = Date.now() - startTime;
    console.log('🌐 [Translation] Language detected:', result.language, `(${detectionTime}ms)`);
    
    return result;
  } catch (error) {
    console.error('🌐 [Translation] Language detection error:', error);
    
    if (error instanceof Error && error.message.includes('Ollama')) {
      return {
        error: 'Translation service is not available. Please check if Ollama is running.',
        code: 'OLLAMA_UNAVAILABLE',
        originalText: text
      };
    }
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error during language detection',
      code: 'LANGUAGE_DETECTION_FAILED',
      originalText: text
    };
  }
}

/**
 * Translate text from source language to target language
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult | TranslationError> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        error: 'Text is empty',
        code: 'TRANSLATION_FAILED',
        originalText: text,
        targetLanguage
      };
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return {
        error: `Text is too long (${text.length} characters, max ${MAX_TEXT_LENGTH})`,
        code: 'TEXT_TOO_LONG',
        originalText: text,
        targetLanguage
      };
    }
    
    // Validate target language
    const targetLang = SUPPORTED_LANGUAGES.find(lang => lang.code === targetLanguage);
    if (!targetLang) {
      return {
        error: `Unsupported target language: ${targetLanguage}`,
        code: 'UNSUPPORTED_LANGUAGE',
        originalText: text,
        targetLanguage
      };
    }
    
    // Auto-detect source language if not provided
    let detectedSourceLanguage = sourceLanguage;
    if (!sourceLanguage) {
      const detection = await detectLanguage(text);
      if ('error' in detection) {
        return {
          error: `Failed to detect source language: ${detection.error}`,
          code: 'LANGUAGE_DETECTION_FAILED',
          originalText: text,
          targetLanguage
        };
      }
      detectedSourceLanguage = detection.language;
    }
    
    // Check if source and target are the same
    if (detectedSourceLanguage === targetLanguage) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: detectedSourceLanguage,
        targetLanguage,
        confidence: 1.0,
        translatedAt: Date.now(),
        wordCount: text.split(/\s+/).length,
        translationTime: 0
      };
    }
    
    // Check cache first
    const cacheKey = getTranslationCacheKey(text, targetLanguage, detectedSourceLanguage);
    const cached = translationCache.get(cacheKey);
    if (cached && Date.now() - cached.translatedAt < CACHE_EXPIRY_MS) {
      console.log('🌐 [Translation] Translation cache hit');
      return cached;
    }
    
    // Clean cache periodically
    if (Math.random() < 0.1) {
      cleanCache();
    }
    
    console.log('🌐 [Translation] Translating text:', {
      from: detectedSourceLanguage,
      to: targetLanguage,
      length: text.length
    });
    
    const startTime = Date.now();
    
    const sourceLang = SUPPORTED_LANGUAGES.find(lang => lang.code === detectedSourceLanguage);
    const sourceLanguageName = sourceLang ? sourceLang.name : detectedSourceLanguage;
    
    const prompt = `Translate the following text from ${sourceLanguageName} to ${targetLang.name}. Provide only the translation, no explanations or additional text.

Text to translate: "${text}"

Translation:`;
    
    const response = await getOllamaClient().chat({
      model: 'llama3:latest',
      messages: [{ role: 'user', content: prompt }]
    });
    
    if (!response || typeof response !== 'string') {
      return {
        error: 'No response from translation service',
        code: 'TRANSLATION_FAILED',
        originalText: text,
        sourceLanguage: detectedSourceLanguage,
        targetLanguage
      };
    }
    
    const translatedText = response.trim();
    const translationTime = Date.now() - startTime;
    
    // Calculate confidence based on translation quality heuristics
    let confidence = 0.7; // Base confidence
    
    // Higher confidence if translation is significantly different from original
    if (translatedText !== text) {
      confidence += 0.1;
    }
    
    // Lower confidence if translation seems incomplete
    if (translatedText.length < text.length * 0.3) {
      confidence -= 0.2;
    }
    
    // Ensure confidence is between 0 and 1
    confidence = Math.max(0.1, Math.min(1.0, confidence));
    
    const result: TranslationResult = {
      originalText: text,
      translatedText,
      sourceLanguage: detectedSourceLanguage || 'unknown',
      targetLanguage,
      confidence,
      translatedAt: Date.now(),
      wordCount: text.split(/\s+/).length,
      translationTime
    };
    
    // Cache the result
    translationCache.set(cacheKey, result);
    
    console.log('🌐 [Translation] Translation completed:', {
      from: result.sourceLanguage,
      to: result.targetLanguage,
      confidence: Math.round(result.confidence * 100) + '%',
      time: translationTime + 'ms'
    });
    
    return result;
  } catch (error) {
    console.error('🌐 [Translation] Translation error:', error);
    
    if (error instanceof Error && error.message.includes('Ollama')) {
      return {
        error: 'Translation service is not available. Please check if Ollama is running.',
        code: 'OLLAMA_UNAVAILABLE',
        originalText: text,
        sourceLanguage,
        targetLanguage
      };
    }
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error during translation',
      code: 'TRANSLATION_FAILED',
      originalText: text,
      sourceLanguage,
      targetLanguage
    };
  }
}

/**
 * Get popular languages for UI display
 */
export function getPopularLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.popular);
}

/**
 * Get all supported languages
 */
export function getAllSupportedLanguages(): SupportedLanguage[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Find language by code
 */
export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): { cleared: number } {
  const translationCount = translationCache.size;
  const detectionCount = languageDetectionCache.size;
  
  translationCache.clear();
  languageDetectionCache.clear();
  
  const totalCleared = translationCount + detectionCount;
  console.log('🌐 [Translation] Cache cleared:', totalCleared, 'entries');
  
  return { cleared: totalCleared };
}

/**
 * Get translation cache statistics
 */
export function getTranslationCacheStats(): {
  translationCacheSize: number;
  detectionCacheSize: number;
  totalCacheSize: number;
  oldestTranslation?: number;
  newestTranslation?: number;
} {
  const translationEntries = Array.from(translationCache.values());
  const detectionEntries = Array.from(languageDetectionCache.values());
  
  let oldestTranslation: number | undefined;
  let newestTranslation: number | undefined;
  
  if (translationEntries.length > 0) {
    const timestamps = translationEntries.map(entry => entry.translatedAt);
    oldestTranslation = Math.min(...timestamps);
    newestTranslation = Math.max(...timestamps);
  }
  
  return {
    translationCacheSize: translationCache.size,
    detectionCacheSize: languageDetectionCache.size,
    totalCacheSize: translationCache.size + languageDetectionCache.size,
    oldestTranslation,
    newestTranslation
  };
}

/**
 * Translate page content with chunking for large texts
 */
export async function translatePageContent(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string,
  options: {
    chunkSize?: number;
    preserveFormatting?: boolean;
  } = {}
): Promise<TranslationResult | TranslationError> {
  const { chunkSize = 2000, preserveFormatting = true } = options;
  
  try {
    // For small content, translate directly
    if (content.length <= chunkSize) {
      return await translateText(content, targetLanguage, sourceLanguage);
    }
    
    console.log('🌐 [Translation] Translating large content in chunks:', {
      totalLength: content.length,
      chunkSize,
      estimatedChunks: Math.ceil(content.length / chunkSize)
    });
    
    // Split content into chunks (try to split at sentence boundaries)
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = content.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    // Translate each chunk
    const translatedChunks: string[] = [];
    let totalTranslationTime = 0;
    let detectedSourceLanguage = sourceLanguage;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🌐 [Translation] Translating chunk ${i + 1}/${chunks.length}`);
      
      const result = await translateText(chunk, targetLanguage, detectedSourceLanguage);
      
      if ('error' in result) {
        return result; // Return error if any chunk fails
      }
      
      translatedChunks.push(result.translatedText);
      totalTranslationTime += result.translationTime;
      
      // Use detected language from first chunk for subsequent chunks
      if (i === 0) {
        detectedSourceLanguage = result.sourceLanguage;
      }
    }
    
    // Combine translated chunks
    const translatedText = translatedChunks.join(preserveFormatting ? ' ' : '\n\n');
    
    const result: TranslationResult = {
      originalText: content,
      translatedText,
      sourceLanguage: detectedSourceLanguage || 'unknown',
      targetLanguage,
      confidence: 0.8, // Slightly lower confidence for chunked translation
      translatedAt: Date.now(),
      wordCount: content.split(/\s+/).length,
      translationTime: totalTranslationTime
    };
    
    console.log('🌐 [Translation] Large content translation completed:', {
      chunks: chunks.length,
      totalTime: totalTranslationTime + 'ms',
      originalLength: content.length,
      translatedLength: translatedText.length
    });
    
    return result;
  } catch (error) {
    console.error('🌐 [Translation] Page content translation error:', error);
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error during page translation',
      code: 'TRANSLATION_FAILED',
      originalText: content,
      sourceLanguage,
      targetLanguage
    };
  }
}