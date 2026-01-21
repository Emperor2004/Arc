/**
 * Command Registry for Arc Browser Command Palette
 * Manages command registration, search, and execution
 */

export type CommandId = 
  | 'tab:new'
  | 'tab:switch-next'
  | 'tab:switch-prev'
  | 'tab:close'
  | 'jarvis:focus'
  | 'jarvis:analyze-page'
  | 'jarvis:summarize-page'
  | 'jarvis:explain-page'
  | 'history:search'
  | 'session:restore'
  | 'settings:open'
  | 'workspace:save'
  | 'workspace:switch'
  | 'workspace:list'
  | 'workspace:delete'
  | 'diagnostics:open'
  | 'demo:open-workspace';

export interface Command {
  id: CommandId;
  title: string;
  description?: string;
  category: 'tab' | 'jarvis' | 'workspace' | 'system';
  keywords?: string[];
  run(): void | Promise<void>;
}

export interface SerializableCommand {
  id: CommandId;
  title: string;
  description?: string;
  category: string;
  keywords?: string[];
  enabled: boolean;
  customized: boolean;
}

export interface CommandRegistryData {
  version: string;
  commands: SerializableCommand[];
  customCommands: SerializableCommand[];
  lastModified: number;
}

export class CommandRegistry {
  private commands: Map<CommandId, Command> = new Map();
  private searchCache: Map<string, Command[]> = new Map();
  private readonly CACHE_SIZE_LIMIT = 100;

  /**
   * Register a command in the registry
   */
  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
    this.clearSearchCache();
  }

  /**
   * Unregister a command from the registry
   */
  unregisterCommand(id: CommandId): void {
    this.commands.delete(id);
    this.clearSearchCache();
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Find commands matching a search query
   * Uses fuzzy matching on title, description, and keywords
   */
  findCommands(query: string): Command[] {
    if (!query.trim()) {
      return this.getAllCommands();
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Check cache first
    if (this.searchCache.has(normalizedQuery)) {
      return this.searchCache.get(normalizedQuery)!;
    }

    const allCommands = this.getAllCommands();
    const results = allCommands
      .map(command => ({
        command,
        score: this.calculateMatchScore(command, normalizedQuery)
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.command);

    // Cache results if cache isn't too large
    if (this.searchCache.size < this.CACHE_SIZE_LIMIT) {
      this.searchCache.set(normalizedQuery, results);
    }

    return results;
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(id: CommandId): Promise<void> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }

    try {
      await command.run();
    } catch (error) {
      console.error(`Error executing command ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get command by ID
   */
  getCommand(id: CommandId): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * Check if a command is registered
   */
  hasCommand(id: CommandId): boolean {
    return this.commands.has(id);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: Command['category']): Command[] {
    return this.getAllCommands().filter(cmd => cmd.category === category);
  }

  /**
   * Clear the search cache
   */
  private clearSearchCache(): void {
    this.searchCache.clear();
  }

  /**
   * Calculate match score for a command against a query
   * Higher score = better match
   */
  private calculateMatchScore(command: Command, query: string): number {
    let score = 0;
    const queryWords = query.split(/\s+/);

    // Check title match
    const titleLower = command.title.toLowerCase();
    if (titleLower.includes(query)) {
      score += titleLower.startsWith(query) ? 100 : 80;
    }

    // Check individual word matches in title
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        score += 20;
      }
    }

    // Check description match
    if (command.description) {
      const descLower = command.description.toLowerCase();
      if (descLower.includes(query)) {
        score += 40;
      }
      for (const word of queryWords) {
        if (descLower.includes(word)) {
          score += 10;
        }
      }
    }

    // Check keywords match
    if (command.keywords) {
      for (const keyword of command.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (keywordLower.includes(query)) {
          score += 60;
        }
        for (const word of queryWords) {
          if (keywordLower.includes(word)) {
            score += 15;
          }
        }
      }
    }

    // Check category match
    if (command.category.toLowerCase().includes(query)) {
      score += 30;
    }

    return score;
  }

  /**
   * Serialize commands to JSON-compatible format
   */
  serialize(): CommandRegistryData {
    const commands = this.getAllCommands().map(cmd => ({
      id: cmd.id,
      title: cmd.title,
      description: cmd.description,
      category: cmd.category,
      keywords: cmd.keywords,
      enabled: true,
      customized: false
    }));

    return {
      version: '1.0.0',
      commands,
      customCommands: [],
      lastModified: Date.now()
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalCommands: number;
    commandsByCategory: Record<string, number>;
    cacheSize: number;
  } {
    const commands = this.getAllCommands();
    const commandsByCategory: Record<string, number> = {};

    for (const command of commands) {
      commandsByCategory[command.category] = (commandsByCategory[command.category] || 0) + 1;
    }

    return {
      totalCommands: commands.length,
      commandsByCategory,
      cacheSize: this.searchCache.size
    };
  }
}

// Singleton instance
let commandRegistry: CommandRegistry | null = null;

/**
 * Get the global command registry instance
 */
export function getCommandRegistry(): CommandRegistry {
  if (!commandRegistry) {
    commandRegistry = new CommandRegistry();
  }
  return commandRegistry;
}

/**
 * Reset the command registry (useful for testing)
 */
export function resetCommandRegistry(): void {
  commandRegistry = null;
}