/**
 * Jarvis Actions - Enhanced page analysis capabilities
 * Provides structured AI analysis of current page content
 */

// Import global types to access window.arc
declare global {
  interface Window {
    arc: import('../renderer/types/global').ArcAPI;
  }
}

export interface JarvisChatMessage {
  from: string;
  text: string;
}

/**
 * Analyze the current page content with AI
 * Provides comprehensive analysis including key points, insights, and recommendations
 */
export async function analyzeCurrentPage(): Promise<JarvisChatMessage[]> {
  try {
    // Check if window.arc is available
    if (!window.arc || !window.arc.getCurrentPageText) {
      throw new Error('Page content extraction not available');
    }

    // Get current page content
    const result = await window.arc.getCurrentPageText();
    
    if (!result.ok || !result.text) {
      throw new Error(result.error || 'Failed to extract page content');
    }

    const pageText = result.text.trim();
    
    if (!pageText) {
      return [{
        from: 'jarvis',
        text: 'This page appears to be empty or contains no readable text content.'
      }];
    }

    // Create analysis prompt
    const systemMessage = {
      from: 'system',
      text: `You are Jarvis, an AI assistant that analyzes web page content. Provide a comprehensive analysis of the following page content. Include:

1. **Main Topic & Purpose**: What is this page about?
2. **Key Points**: The most important information or arguments
3. **Insights**: Notable patterns, implications, or connections
4. **Recommendations**: Suggested actions or related topics to explore

Keep your analysis concise but thorough. Use clear formatting with headers and bullet points where appropriate.`
    };

    const userMessage = {
      from: 'user',
      text: `Please analyze this page content:\n\n${pageText}`
    };

    return [systemMessage, userMessage];
  } catch (error) {
    console.error('Error in analyzeCurrentPage:', error);
    return [{
      from: 'jarvis',
      text: `I encountered an error while trying to analyze the current page: ${error instanceof Error ? error.message : 'Unknown error'}`
    }];
  }
}

/**
 * Summarize the current page content
 * Provides a concise summary of the main points
 */
export async function summarizeCurrentPage(): Promise<JarvisChatMessage[]> {
  try {
    // Check if window.arc is available
    if (!window.arc || !window.arc.getCurrentPageText) {
      throw new Error('Page content extraction not available');
    }

    // Get current page content
    const result = await window.arc.getCurrentPageText();
    
    if (!result.ok || !result.text) {
      throw new Error(result.error || 'Failed to extract page content');
    }

    const pageText = result.text.trim();
    
    if (!pageText) {
      return [{
        from: 'jarvis',
        text: 'This page appears to be empty or contains no readable text content to summarize.'
      }];
    }

    // Create summary prompt
    const systemMessage = {
      from: 'system',
      text: `You are Jarvis, an AI assistant that creates concise summaries. Provide a clear, well-structured summary of the following page content. Focus on:

- The main topic and key message
- Important facts, data, or arguments
- Conclusions or outcomes
- Any actionable information

Keep the summary concise but comprehensive, using bullet points or short paragraphs as appropriate.`
    };

    const userMessage = {
      from: 'user',
      text: `Please summarize this page content:\n\n${pageText}`
    };

    return [systemMessage, userMessage];
  } catch (error) {
    console.error('Error in summarizeCurrentPage:', error);
    return [{
      from: 'jarvis',
      text: `I encountered an error while trying to summarize the current page: ${error instanceof Error ? error.message : 'Unknown error'}`
    }];
  }
}

/**
 * Explain the current page content in simple terms
 * Provides an easy-to-understand explanation suitable for general audiences
 */
export async function explainCurrentPageSimply(): Promise<JarvisChatMessage[]> {
  try {
    // Check if window.arc is available
    if (!window.arc || !window.arc.getCurrentPageText) {
      throw new Error('Page content extraction not available');
    }

    // Get current page content
    const result = await window.arc.getCurrentPageText();
    
    if (!result.ok || !result.text) {
      throw new Error(result.error || 'Failed to extract page content');
    }

    const pageText = result.text.trim();
    
    if (!pageText) {
      return [{
        from: 'jarvis',
        text: 'This page appears to be empty or contains no readable text content to explain.'
      }];
    }

    // Create simple explanation prompt
    const systemMessage = {
      from: 'system',
      text: `You are Jarvis, an AI assistant that explains complex topics in simple, easy-to-understand language. Take the following page content and explain it as if you're talking to someone who isn't familiar with the topic. 

Guidelines:
- Use simple, everyday language
- Avoid jargon and technical terms (or explain them when necessary)
- Break down complex concepts into smaller, digestible parts
- Use analogies or examples when helpful
- Focus on what matters most to a general audience

Make it conversational and engaging while being accurate and informative.`
    };

    const userMessage = {
      from: 'user',
      text: `Please explain this page content in simple terms:\n\n${pageText}`
    };

    return [systemMessage, userMessage];
  } catch (error) {
    console.error('Error in explainCurrentPageSimply:', error);
    return [{
      from: 'jarvis',
      text: `I encountered an error while trying to explain the current page: ${error instanceof Error ? error.message : 'Unknown error'}`
    }];
  }
}

/**
 * Execute a Jarvis action and get the AI response
 * This is a helper function that handles the full workflow
 */
export async function executeJarvisAction(
  actionType: 'analyze' | 'summarize' | 'explain'
): Promise<string> {
  try {
    let messages: JarvisChatMessage[];
    
    switch (actionType) {
      case 'analyze':
        messages = await analyzeCurrentPage();
        break;
      case 'summarize':
        messages = await summarizeCurrentPage();
        break;
      case 'explain':
        messages = await explainCurrentPageSimply();
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // If we got an error message, return it directly
    if (messages.length === 1 && messages[0].from === 'jarvis') {
      return messages[0].text;
    }

    // Otherwise, send to Jarvis chat for AI processing
    if (window.arc && window.arc.jarvisChat) {
      const result = await window.arc.jarvisChat(messages);
      
      if (result && result.ok && result.reply) {
        return result.reply;
      } else if (result && result.useFallback) {
        return result.reply || 'Ollama is not available. Please ensure Ollama is running and has models installed.';
      } else {
        throw new Error(result?.error || 'Failed to get AI response');
      }
    } else {
      throw new Error('Jarvis chat not available');
    }
  } catch (error) {
    console.error(`Error in executeJarvisAction(${actionType}):`, error);
    return `I encountered an error while trying to ${actionType} the current page: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}