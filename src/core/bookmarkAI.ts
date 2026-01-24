/**
 * AI-powered bookmark organization using Ollama
 * Provides intelligent folder suggestions and bookmark categorization
 */

import { Bookmark, BookmarkFolder } from './types';
import { getOllamaClient, OllamaError, OllamaErrorType } from './ollamaClient';
import { getAllFolders, addFolder } from './bookmarkStore';

export interface FolderSuggestion {
  name: string;
  description: string;
  color: BookmarkFolder['color'];
  bookmarkIds: string[];
}

export interface BookmarkOrganizationResult {
  folders: FolderSuggestion[];
  assignments: Map<string, string>; // bookmarkId -> folderId
  unassigned: string[]; // bookmarkIds that couldn't be categorized
}

// Cache for AI suggestions to avoid repeated API calls
interface SuggestionCache {
  bookmarkHashes: string;
  result: BookmarkOrganizationResult;
  timestamp: number;
}

let suggestionCache: SuggestionCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a hash of bookmark data for caching
 */
function generateBookmarkHash(bookmarks: Bookmark[]): string {
  const data = bookmarks.map(b => `${b.url}|${b.title}`).join('||');
  return btoa(data).slice(0, 32); // Simple hash for caching
}

/**
 * Default folder suggestions with colors
 */
const DEFAULT_FOLDERS: Array<{ name: string; description: string; color: BookmarkFolder['color'] }> = [
  { name: 'Work', description: 'Professional and work-related bookmarks', color: 'blue' },
  { name: 'Learning', description: 'Educational content, tutorials, and documentation', color: 'green' },
  { name: 'News', description: 'News articles and current events', color: 'red' },
  { name: 'Entertainment', description: 'Videos, games, and entertainment content', color: 'purple' },
  { name: 'Shopping', description: 'E-commerce and shopping websites', color: 'orange' },
  { name: 'Social', description: 'Social media and communication platforms', color: 'pink' },
  { name: 'Tools', description: 'Utilities, tools, and productivity apps', color: 'gray' },
  { name: 'Reference', description: 'Reference materials and documentation', color: 'yellow' }
];

/**
 * Fallback heuristic categorization when AI is unavailable
 */
function categorizeBookmarksHeuristic(bookmarks: Bookmark[]): BookmarkOrganizationResult {
  const assignments = new Map<string, string>();
  const folderMap = new Map<string, FolderSuggestion>();
  const unassigned: string[] = [];

  // Initialize default folders
  DEFAULT_FOLDERS.forEach(folder => {
    folderMap.set(folder.name, {
      ...folder,
      bookmarkIds: []
    });
  });

  // Simple keyword-based categorization
  const categoryKeywords = {
    'Work': ['linkedin', 'slack', 'teams', 'office', 'work', 'corporate', 'business', 'enterprise'],
    'Learning': ['tutorial', 'course', 'learn', 'education', 'documentation', 'docs', 'guide', 'how-to', 'stackoverflow', 'github'],
    'News': ['news', 'article', 'blog', 'medium', 'reuters', 'bbc', 'cnn', 'techcrunch'],
    'Entertainment': ['youtube', 'netflix', 'spotify', 'twitch', 'game', 'movie', 'music', 'video'],
    'Shopping': ['amazon', 'shop', 'store', 'buy', 'cart', 'ebay', 'etsy', 'marketplace'],
    'Social': ['facebook', 'twitter', 'instagram', 'reddit', 'discord', 'social'],
    'Tools': ['tool', 'utility', 'app', 'software', 'service', 'api', 'calculator'],
    'Reference': ['wiki', 'reference', 'dictionary', 'manual', 'spec', 'standard']
  };

  bookmarks.forEach(bookmark => {
    const text = `${bookmark.title} ${bookmark.url}`.toLowerCase();
    let categorized = false;

    // Try to match against category keywords
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const folder = folderMap.get(category);
        if (folder) {
          folder.bookmarkIds.push(bookmark.id);
          assignments.set(bookmark.id, category);
          categorized = true;
          break;
        }
      }
    }

    if (!categorized) {
      unassigned.push(bookmark.id);
    }
  });

  // Only include folders that have bookmarks
  const folders = Array.from(folderMap.values()).filter(folder => folder.bookmarkIds.length > 0);

  return {
    folders,
    assignments,
    unassigned
  };
}

/**
 * Use AI to suggest folder organization for bookmarks
 */
async function suggestFoldersWithAI(bookmarks: Bookmark[], model: string = 'llama3:latest'): Promise<BookmarkOrganizationResult> {
  const ollamaClient = getOllamaClient();

  // Prepare bookmark data for AI analysis
  const bookmarkData = bookmarks.slice(0, 50).map((bookmark, index) => ({
    id: bookmark.id,
    index: index + 1,
    title: bookmark.title,
    url: bookmark.url,
    domain: new URL(bookmark.url).hostname,
    tags: bookmark.tags || []
  }));

  const prompt = `You are an AI assistant that helps organize bookmarks into folders. Analyze the following bookmarks and suggest folder categories.

Bookmarks to organize:
${bookmarkData.map(b => `${b.index}. "${b.title}" - ${b.domain} (ID: ${b.id})`).join('\n')}

Please suggest 3-6 folder categories that would best organize these bookmarks. For each folder, provide:
1. A clear, concise name (1-2 words)
2. A brief description
3. Which bookmark IDs belong in this folder
4. A color (red, blue, green, yellow, purple, gray, orange, pink)

Respond in this exact JSON format:
{
  "folders": [
    {
      "name": "Work",
      "description": "Professional and work-related bookmarks",
      "color": "blue",
      "bookmarkIds": ["bookmark-id-1", "bookmark-id-2"]
    }
  ],
  "unassigned": ["bookmark-id-3"]
}

Only include bookmark IDs that were provided in the input. If a bookmark doesn't fit well into any category, put its ID in the "unassigned" array.`;

  try {
    const response = await ollamaClient.generate({
      model,
      prompt,
      options: {
        temperature: 0.3, // Lower temperature for more consistent categorization
      }
    });

    // Parse AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response does not contain valid JSON');
    }

    const aiResult = JSON.parse(jsonMatch[0]);
    
    // Validate and transform the result
    const folders: FolderSuggestion[] = (aiResult.folders || []).map((folder: any) => ({
      name: folder.name || 'Untitled',
      description: folder.description || '',
      color: folder.color || 'blue',
      bookmarkIds: Array.isArray(folder.bookmarkIds) ? folder.bookmarkIds : []
    }));

    const assignments = new Map<string, string>();
    folders.forEach(folder => {
      folder.bookmarkIds.forEach(bookmarkId => {
        assignments.set(bookmarkId, folder.name);
      });
    });

    const unassigned = Array.isArray(aiResult.unassigned) ? aiResult.unassigned : [];

    return {
      folders,
      assignments,
      unassigned
    };

  } catch (error) {
    console.error('Error getting AI folder suggestions:', error);
    throw error;
  }
}

/**
 * Suggest folder organization for bookmarks with AI fallback
 */
export async function suggestFoldersForBookmarks(
  bookmarks: Bookmark[],
  useAI: boolean = true,
  model: string = 'llama3:latest'
): Promise<BookmarkOrganizationResult> {
  // Check cache first
  const bookmarkHash = generateBookmarkHash(bookmarks);
  if (suggestionCache && 
      suggestionCache.bookmarkHashes === bookmarkHash && 
      Date.now() - suggestionCache.timestamp < CACHE_TTL) {
    console.log('🔖 [BookmarkAI] Using cached suggestions');
    return suggestionCache.result;
  }

  let result: BookmarkOrganizationResult;

  if (useAI) {
    try {
      console.log('🔖 [BookmarkAI] Getting AI-powered folder suggestions');
      result = await suggestFoldersWithAI(bookmarks, model);
      console.log('🔖 [BookmarkAI] AI suggestions generated successfully');
    } catch (error) {
      console.warn('🔖 [BookmarkAI] AI suggestions failed, falling back to heuristics:', error);
      result = categorizeBookmarksHeuristic(bookmarks);
    }
  } else {
    console.log('🔖 [BookmarkAI] Using heuristic folder suggestions');
    result = categorizeBookmarksHeuristic(bookmarks);
  }

  // Cache the result
  suggestionCache = {
    bookmarkHashes: bookmarkHash,
    result,
    timestamp: Date.now()
  };

  return result;
}

/**
 * Apply folder suggestions by creating folders and assigning bookmarks
 */
export async function applyFolderSuggestions(
  suggestions: BookmarkOrganizationResult,
  createFolders: boolean = true
): Promise<{ createdFolders: BookmarkFolder[]; errors: string[] }> {
  const createdFolders: BookmarkFolder[] = [];
  const errors: string[] = [];

  if (createFolders) {
    // Create suggested folders
    for (const suggestion of suggestions.folders) {
      try {
        const folder = await addFolder(suggestion.name, suggestion.color, suggestion.description);
        createdFolders.push(folder);
        console.log(`🔖 [BookmarkAI] Created folder: ${folder.name}`);
      } catch (error) {
        const errorMsg = `Failed to create folder "${suggestion.name}": ${error}`;
        errors.push(errorMsg);
        console.error('🔖 [BookmarkAI]', errorMsg);
      }
    }
  }

  return { createdFolders, errors };
}

/**
 * Get smart folder suggestions based on existing bookmarks
 */
export async function getSmartFolderSuggestions(limit: number = 5): Promise<FolderSuggestion[]> {
  try {
    // This could be enhanced to analyze existing bookmarks and suggest new folders
    // For now, return default suggestions
    return DEFAULT_FOLDERS.slice(0, limit).map(folder => ({
      ...folder,
      bookmarkIds: []
    }));
  } catch (error) {
    console.error('Error getting smart folder suggestions:', error);
    return [];
  }
}

/**
 * Clear suggestion cache (useful for testing or when bookmarks change significantly)
 */
export function clearSuggestionCache(): void {
  suggestionCache = null;
}

/**
 * Check if AI-powered suggestions are available
 */
export async function isAIAvailable(): Promise<boolean> {
  try {
    const ollamaClient = getOllamaClient();
    return await ollamaClient.isAvailable();
  } catch (error) {
    return false;
  }
}