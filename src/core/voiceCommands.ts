/**
 * Voice Commands Processing Pipeline
 * Handles intent parsing, command mapping, and execution
 */

import { getOllamaClient } from './ollamaClient';
import { getCommandRegistry } from './commandRegistry';

export interface VoiceCommand {
  id: string;
  patterns: string[];
  category: 'tab' | 'navigation' | 'jarvis' | 'bookmark' | 'workspace' | 'system' | 'translation' | 'reading-list';
  action: string;
  parameters?: string[];
  confidence: number;
  description: string;
  examples: string[];
}

export interface VoiceIntent {
  command: string;
  confidence: number;
  parameters: Record<string, any>;
  originalText: string;
  processingTime: number;
}

export interface VoiceCommandResult {
  success: boolean;
  intent?: VoiceIntent;
  error?: string;
  fallbackSuggestions?: string[];
  executionTime: number;
}

// Predefined voice command patterns
const VOICE_COMMANDS: VoiceCommand[] = [
  // Tab commands
  {
    id: 'tab:new',
    patterns: [
      'new tab', 'open new tab', 'create tab', 'add tab',
      'open tab', 'make new tab', 'start new tab'
    ],
    category: 'tab',
    action: 'tab:new',
    confidence: 0.9,
    description: 'Open a new tab',
    examples: ['new tab', 'open new tab', 'create tab']
  },
  {
    id: 'tab:close',
    patterns: [
      'close tab', 'close this tab', 'close current tab',
      'shut tab', 'remove tab', 'delete tab'
    ],
    category: 'tab',
    action: 'tab:close',
    confidence: 0.9,
    description: 'Close the current tab',
    examples: ['close tab', 'close this tab', 'shut tab']
  },
  {
    id: 'tab:next',
    patterns: [
      'next tab', 'switch to next tab', 'go to next tab',
      'tab right', 'move right', 'forward tab'
    ],
    category: 'tab',
    action: 'tab:switch-next',
    confidence: 0.9,
    description: 'Switch to the next tab',
    examples: ['next tab', 'switch to next tab', 'tab right']
  },
  {
    id: 'tab:previous',
    patterns: [
      'previous tab', 'switch to previous tab', 'go to previous tab',
      'tab left', 'move left', 'back tab', 'last tab'
    ],
    category: 'tab',
    action: 'tab:switch-prev',
    confidence: 0.9,
    description: 'Switch to the previous tab',
    examples: ['previous tab', 'tab left', 'back tab']
  },

  // Navigation commands
  {
    id: 'navigation:go',
    patterns: [
      'go to *', 'navigate to *', 'open *', 'visit *',
      'browse to *', 'load *', 'show me *'
    ],
    category: 'navigation',
    action: 'navigate',
    parameters: ['url'],
    confidence: 0.8,
    description: 'Navigate to a website',
    examples: ['go to google.com', 'navigate to youtube', 'open reddit']
  },
  {
    id: 'navigation:reload',
    patterns: [
      'reload', 'refresh', 'reload page', 'refresh page',
      'reload this page', 'refresh this page'
    ],
    category: 'navigation',
    action: 'reload',
    confidence: 0.9,
    description: 'Reload the current page',
    examples: ['reload', 'refresh', 'reload page']
  },

  // Jarvis commands
  {
    id: 'jarvis:focus',
    patterns: [
      'focus jarvis', 'open jarvis', 'show jarvis',
      'jarvis', 'talk to jarvis', 'chat with jarvis'
    ],
    category: 'jarvis',
    action: 'jarvis:focus',
    confidence: 0.9,
    description: 'Focus the Jarvis chat input',
    examples: ['focus jarvis', 'open jarvis', 'jarvis']
  },
  {
    id: 'jarvis:analyze',
    patterns: [
      'analyze page', 'analyze this page', 'analyze current page',
      'what is this page about', 'explain this page', 'page analysis'
    ],
    category: 'jarvis',
    action: 'jarvis:analyze-page',
    confidence: 0.8,
    description: 'Analyze the current page content',
    examples: ['analyze page', 'what is this page about', 'page analysis']
  },
  {
    id: 'jarvis:summarize',
    patterns: [
      'summarize page', 'summarize this page', 'page summary',
      'give me a summary', 'what are the key points', 'tldr'
    ],
    category: 'jarvis',
    action: 'jarvis:summarize-page',
    confidence: 0.8,
    description: 'Summarize the current page content',
    examples: ['summarize page', 'page summary', 'tldr']
  },

  // Bookmark commands
  {
    id: 'bookmark:add',
    patterns: [
      'bookmark this', 'bookmark page', 'add bookmark',
      'save bookmark', 'bookmark this page', 'add to bookmarks'
    ],
    category: 'bookmark',
    action: 'bookmark:add',
    confidence: 0.9,
    description: 'Bookmark the current page',
    examples: ['bookmark this', 'add bookmark', 'save bookmark']
  },
  {
    id: 'bookmark:open-panel',
    patterns: [
      'show bookmarks', 'open bookmarks', 'bookmarks panel',
      'view bookmarks', 'bookmark manager'
    ],
    category: 'bookmark',
    action: 'bookmark:open-panel',
    confidence: 0.9,
    description: 'Open the bookmarks panel',
    examples: ['show bookmarks', 'open bookmarks', 'bookmarks panel']
  },

  // Translation commands
  {
    id: 'translation:translate-english',
    patterns: [
      'translate to english', 'translate this to english',
      'english translation', 'convert to english'
    ],
    category: 'translation',
    action: 'translation:translate-to-english',
    confidence: 0.8,
    description: 'Translate the current page to English',
    examples: ['translate to english', 'english translation']
  },
  {
    id: 'translation:detect',
    patterns: [
      'detect language', 'what language is this',
      'identify language', 'language detection'
    ],
    category: 'translation',
    action: 'translation:detect-language',
    confidence: 0.8,
    description: 'Detect the language of the current page',
    examples: ['detect language', 'what language is this']
  },

  // Reading list commands
  {
    id: 'reading-list:add',
    patterns: [
      'save to reading list', 'add to reading list',
      'read later', 'save for later', 'reading list'
    ],
    category: 'reading-list',
    action: 'reading-list:add-current',
    confidence: 0.8,
    description: 'Save the current page to reading list',
    examples: ['save to reading list', 'read later', 'save for later']
  },

  // System commands
  {
    id: 'system:settings',
    patterns: [
      'open settings', 'show settings', 'settings',
      'preferences', 'options', 'configuration'
    ],
    category: 'system',
    action: 'settings:open',
    confidence: 0.9,
    description: 'Open the settings panel',
    examples: ['open settings', 'settings', 'preferences']
  }
];

// Intent classification cache
const intentCache = new Map<string, VoiceIntent>();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

/**
 * Clean expired entries from intent cache
 */
function cleanIntentCache(): void {
  if (intentCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(intentCache.entries());
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => intentCache.delete(key));
  }
}

/**
 * Rule-based intent classification using pattern matching
 */
function classifyIntentRuleBased(text: string): VoiceIntent | null {
  const normalizedText = text.toLowerCase().trim();
  
  for (const command of VOICE_COMMANDS) {
    for (const pattern of command.patterns) {
      const normalizedPattern = pattern.toLowerCase();
      
      // Handle wildcard patterns
      if (pattern.includes('*')) {
        const regexPattern = normalizedPattern
          .replace(/\*/g, '(.+)')
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\(\\.\\+\\)/g, '(.+)');
        
        const regex = new RegExp(`^${regexPattern}$`);
        const match = normalizedText.match(regex);
        
        if (match) {
          const parameters: Record<string, any> = {};
          
          // Extract parameters from wildcard matches
          if (command.parameters && match.length > 1) {
            command.parameters.forEach((param, index) => {
              if (match[index + 1]) {
                parameters[param] = match[index + 1].trim();
              }
            });
          }
          
          return {
            command: command.action,
            confidence: command.confidence,
            parameters,
            originalText: text,
            processingTime: 0
          };
        }
      } else {
        // Exact or fuzzy matching for non-wildcard patterns
        const similarity = calculateSimilarity(normalizedText, normalizedPattern);
        
        if (similarity > 0.8) {
          return {
            command: command.action,
            confidence: command.confidence * similarity,
            parameters: {},
            originalText: text,
            processingTime: 0
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Calculate text similarity using Levenshtein distance
 */
function calculateSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

/**
 * LLM-based intent classification for complex or ambiguous commands
 */
async function classifyIntentLLM(text: string): Promise<VoiceIntent | null> {
  try {
    console.log('🎤 [Voice] Using LLM for intent classification:', text);
    
    const availableCommands = VOICE_COMMANDS.map(cmd => ({
      action: cmd.action,
      description: cmd.description,
      examples: cmd.examples.slice(0, 2) // Limit examples for prompt size
    }));
    
    const prompt = `You are a voice command classifier for a web browser. Analyze the user's voice command and determine the most appropriate action.

Available commands:
${availableCommands.map(cmd => `- ${cmd.action}: ${cmd.description} (examples: ${cmd.examples.join(', ')})`).join('\n')}

User command: "${text}"

Respond with a JSON object containing:
- "action": the most appropriate command action (or null if no match)
- "confidence": confidence score between 0 and 1
- "parameters": object with any extracted parameters (empty object if none)
- "reasoning": brief explanation of your choice

Example response:
{"action": "tab:new", "confidence": 0.9, "parameters": {}, "reasoning": "User wants to open a new tab"}`;

    const response = await getOllamaClient().chat({
      model: 'llama3:latest',
      messages: [{ role: 'user', content: prompt }]
    });
    
    if (!response || typeof response !== 'string') {
      return null;
    }
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('🎤 [Voice] LLM response not in expected JSON format');
      return null;
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    if (!result.action || result.confidence < 0.5) {
      return null;
    }
    
    console.log('🎤 [Voice] LLM classification result:', result);
    
    return {
      command: result.action,
      confidence: result.confidence,
      parameters: result.parameters || {},
      originalText: text,
      processingTime: 0
    };
  } catch (error) {
    console.error('🎤 [Voice] LLM intent classification error:', error);
    return null;
  }
}

/**
 * Main intent classification function
 */
export async function classifyIntent(text: string): Promise<VoiceIntent | null> {
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  const cached = intentCache.get(cacheKey);
  if (cached) {
    console.log('🎤 [Voice] Intent cache hit');
    return { ...cached, processingTime: Date.now() - startTime };
  }
  
  // Clean cache periodically
  if (Math.random() < 0.1) {
    cleanIntentCache();
  }
  
  console.log('🎤 [Voice] Classifying intent for:', text);
  
  // Try rule-based classification first
  let intent = classifyIntentRuleBased(text);
  
  // If rule-based fails or confidence is low, try LLM
  if (!intent || intent.confidence < 0.7) {
    console.log('🎤 [Voice] Rule-based classification failed, trying LLM');
    const llmIntent = await classifyIntentLLM(text);
    
    // Use LLM result if it's better
    if (llmIntent && (!intent || llmIntent.confidence > intent.confidence)) {
      intent = llmIntent;
    }
  }
  
  if (intent) {
    intent.processingTime = Date.now() - startTime;
    
    // Cache the result
    intentCache.set(cacheKey, intent);
    
    console.log('🎤 [Voice] Intent classified:', {
      command: intent.command,
      confidence: Math.round(intent.confidence * 100) + '%',
      processingTime: intent.processingTime + 'ms'
    });
  } else {
    console.log('🎤 [Voice] No intent classified for:', text);
  }
  
  return intent;
}

/**
 * Execute a voice command
 */
export async function executeVoiceCommand(intent: VoiceIntent): Promise<VoiceCommandResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎤 [Voice] Executing command:', intent.command);
    
    const registry = getCommandRegistry();
    
    // Handle special navigation command
    if (intent.command === 'navigate' && intent.parameters.url) {
      const url = intent.parameters.url;
      console.log('🎤 [Voice] Navigating to:', url);
      
      // Trigger navigation
      if (window.arc && window.arc.navigate) {
        window.arc.navigate(url);
      } else {
        // Fallback: trigger custom event
        const event = new CustomEvent('arc:voice-navigate', { 
          detail: { url } 
        });
        window.dispatchEvent(event);
      }
      
      return {
        success: true,
        intent,
        executionTime: Date.now() - startTime
      };
    }
    
    // Handle reload command
    if (intent.command === 'reload') {
      console.log('🎤 [Voice] Reloading page');
      
      if (window.arc && window.arc.reloadPage) {
        window.arc.reloadPage();
      } else {
        // Fallback: reload current page
        window.location.reload();
      }
      
      return {
        success: true,
        intent,
        executionTime: Date.now() - startTime
      };
    }
    
    // Execute command through registry
    if (registry.hasCommand(intent.command as any)) {
      await registry.executeCommand(intent.command as any);
      
      return {
        success: true,
        intent,
        executionTime: Date.now() - startTime
      };
    } else {
      console.warn('🎤 [Voice] Command not found in registry:', intent.command);
      
      return {
        success: false,
        intent,
        error: `Command not found: ${intent.command}`,
        fallbackSuggestions: getSimilarCommands(intent.command),
        executionTime: Date.now() - startTime
      };
    }
  } catch (error) {
    console.error('🎤 [Voice] Command execution error:', error);
    
    return {
      success: false,
      intent,
      error: error instanceof Error ? error.message : 'Unknown execution error',
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Get similar commands for fallback suggestions
 */
function getSimilarCommands(command: string): string[] {
  const registry = getCommandRegistry();
  const allCommands = registry.getAllCommands();
  
  const similarities = allCommands
    .map(cmd => ({
      command: cmd,
      similarity: calculateSimilarity(command.toLowerCase(), cmd.id.toLowerCase())
    }))
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
  
  return similarities.map(item => item.command.title);
}

/**
 * Get all available voice commands for help/training
 */
export function getAvailableVoiceCommands(): VoiceCommand[] {
  return [...VOICE_COMMANDS];
}

/**
 * Get voice commands by category
 */
export function getVoiceCommandsByCategory(category: VoiceCommand['category']): VoiceCommand[] {
  return VOICE_COMMANDS.filter(cmd => cmd.category === category);
}

/**
 * Process voice input end-to-end
 */
export async function processVoiceInput(text: string): Promise<VoiceCommandResult> {
  console.log('🎤 [Voice] Processing voice input:', text);
  
  const intent = await classifyIntent(text);
  
  if (!intent) {
    return {
      success: false,
      error: 'Could not understand the command',
      fallbackSuggestions: [
        'Try saying "new tab" to open a new tab',
        'Say "bookmark this" to bookmark the current page',
        'Say "analyze page" to get page analysis'
      ],
      executionTime: 0
    };
  }
  
  // Execute the command
  return await executeVoiceCommand(intent);
}

/**
 * Clear intent cache
 */
export function clearVoiceCommandCache(): { cleared: number } {
  const count = intentCache.size;
  intentCache.clear();
  console.log('🎤 [Voice] Intent cache cleared:', count, 'entries');
  return { cleared: count };
}

/**
 * Get voice command cache statistics
 */
export function getVoiceCommandCacheStats(): {
  cacheSize: number;
  maxCacheSize: number;
  hitRate?: number;
} {
  return {
    cacheSize: intentCache.size,
    maxCacheSize: MAX_CACHE_SIZE
  };
}