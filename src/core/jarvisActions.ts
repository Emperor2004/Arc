/**
 * Jarvis Actions - Enhanced page analysis capabilities
 * Provides structured AI analysis of current page content
 */

import { summarizeCurrentPage as summarizePageContent, SummaryOptions, SummaryResult, SummaryError } from './summarization';

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
 * Summarize the current page content using the enhanced summarization pipeline
 * Provides structured summaries with different types and metadata
 */
export async function summarizeCurrentPageEnhanced(
  options: SummaryOptions = { type: 'short' }
): Promise<JarvisChatMessage[]> {
  try {
    console.log('🤖 [JarvisActions] Starting enhanced page summarization');
    
    const result = await summarizePageContent(options);
    
    // Handle errors
    if ('error' in result) {
      const error = result as SummaryError;
      let errorMessage = 'I encountered an issue while summarizing the page:\n\n';
      
      switch (error.type) {
        case 'content_extraction':
          errorMessage += '❌ **Content Extraction Failed**\n';
          errorMessage += 'I couldn\'t extract readable content from this page. The page might be empty, require JavaScript, or contain mostly media content.';
          break;
        case 'ollama_unavailable':
          errorMessage += '🔌 **AI Service Unavailable**\n';
          errorMessage += error.error;
          break;
        case 'processing_failed':
          errorMessage += '⚠️ **Processing Error**\n';
          errorMessage += 'The AI service encountered an issue while generating the summary. Please try again.';
          break;
        default:
          errorMessage += '❓ **Unknown Error**\n';
          errorMessage += error.error;
      }
      
      return [{
        from: 'jarvis',
        text: errorMessage
      }];
    }
    
    // Format successful result
    const summary = result as SummaryResult;
    let responseText = '';
    
    // Add summary type header
    const typeNames: Record<SummaryOptions['type'], string> = {
      'short': '📝 **Quick Summary**',
      'bullets': '📋 **Key Points**',
      'insights': '💡 **Key Insights**',
      'detailed': '📖 **Detailed Analysis**'
    };
    
    responseText += `${typeNames[summary.type as keyof typeof typeNames] || '📝 **Summary**'}\n\n`;
    
    // Add main summary
    responseText += summary.summary + '\n\n';
    
    // Add key insights if available
    if (summary.keyInsights && summary.keyInsights.length > 0) {
      responseText += '**Key Takeaways:**\n';
      summary.keyInsights.forEach(insight => {
        responseText += `• ${insight}\n`;
      });
      responseText += '\n';
    }
    
    // Add topics if available
    if (summary.topics && summary.topics.length > 0) {
      responseText += '**Topics:** ' + summary.topics.join(', ') + '\n\n';
    }
    
    // Add keywords if available
    if (summary.keywords && summary.keywords.length > 0) {
      responseText += '**Keywords:** ' + summary.keywords.join(', ') + '\n\n';
    }
    
    // Add metadata
    responseText += '---\n';
    responseText += `📊 **Summary Stats:** ${summary.wordCount} words • ${summary.readingTime} min read • ${Math.round(summary.confidence * 100)}% confidence\n`;
    responseText += `📄 **Source:** ${summary.sourceWordCount} words • ${summary.sourceReadingTime} min read`;
    
    console.log('🤖 [JarvisActions] Enhanced summary generated successfully');
    
    return [{
      from: 'jarvis',
      text: responseText
    }];
    
  } catch (error) {
    console.error('🤖 [JarvisActions] Error in enhanced summarization:', error);
    return [{
      from: 'jarvis',
      text: `I encountered an unexpected error while summarizing the page: ${error instanceof Error ? error.message : 'Unknown error'}`
    }];
  }
}

/**
 * Get multiple summary types for the current page
 */
export async function getMultipleSummaries(): Promise<JarvisChatMessage[]> {
  try {
    console.log('🤖 [JarvisActions] Generating multiple summary types');
    
    // Generate different summary types
    const [shortResult, bulletsResult, insightsResult] = await Promise.all([
      summarizePageContent({ type: 'short' }),
      summarizePageContent({ type: 'bullets' }),
      summarizePageContent({ type: 'insights', includeKeywords: true, includeTopics: true })
    ]);
    
    let responseText = '# 📚 **Complete Page Analysis**\n\n';
    
    // Quick Summary
    if ('summary' in shortResult) {
      responseText += '## 📝 Quick Summary\n';
      responseText += shortResult.summary + '\n\n';
    }
    
    // Key Points
    if ('summary' in bulletsResult) {
      responseText += '## 📋 Key Points\n';
      responseText += bulletsResult.summary + '\n\n';
    }
    
    // Insights with metadata
    if ('summary' in insightsResult) {
      responseText += '## 💡 Key Insights\n';
      responseText += insightsResult.summary + '\n\n';
      
      if (insightsResult.keyInsights && insightsResult.keyInsights.length > 0) {
        responseText += '**Additional Takeaways:**\n';
        insightsResult.keyInsights.forEach(insight => {
          responseText += `• ${insight}\n`;
        });
        responseText += '\n';
      }
      
      if (insightsResult.topics && insightsResult.topics.length > 0) {
        responseText += '**Main Topics:** ' + insightsResult.topics.join(', ') + '\n\n';
      }
      
      if (insightsResult.keywords && insightsResult.keywords.length > 0) {
        responseText += '**Key Terms:** ' + insightsResult.keywords.join(', ') + '\n\n';
      }
      
      // Add source stats
      responseText += '---\n';
      responseText += `📊 **Source:** ${insightsResult.sourceWordCount} words • ${insightsResult.sourceReadingTime} min read`;
    }
    
    // If all failed, show error
    if ('error' in shortResult && 'error' in bulletsResult && 'error' in insightsResult) {
      return [{
        from: 'jarvis',
        text: 'I couldn\'t generate summaries for this page. ' + (shortResult as SummaryError).error
      }];
    }
    
    console.log('🤖 [JarvisActions] Multiple summaries generated successfully');
    
    return [{
      from: 'jarvis',
      text: responseText
    }];
    
  } catch (error) {
    console.error('🤖 [JarvisActions] Error generating multiple summaries:', error);
    return [{
      from: 'jarvis',
      text: `I encountered an error while generating multiple summaries: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  actionType: 'analyze' | 'summarize' | 'explain' | 'summarize-enhanced' | 'multiple-summaries'
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
      case 'summarize-enhanced':
        messages = await summarizeCurrentPageEnhanced({ type: 'insights', includeKeywords: true, includeTopics: true });
        break;
      case 'multiple-summaries':
        messages = await getMultipleSummaries();
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // If we got a direct Jarvis response (from enhanced functions), return it
    if (messages.length === 1 && messages[0].from === 'jarvis') {
      return messages[0].text;
    }

    // Otherwise, send to Jarvis chat for AI processing (legacy functions)
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

/**
 * Legacy function - kept for backward compatibility
 * Use summarizeCurrentPageEnhanced for better results
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