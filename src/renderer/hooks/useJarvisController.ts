import { useState, useEffect, useRef } from 'react';
import { Recommendation, FeedbackValue } from '../../core/types';

interface Message {
    from: 'user' | 'jarvis';
    text: string;
}

type JarvisStatus = 'idle' | 'thinking' | 'error';

export interface JarvisController {
    recommendations: Recommendation[];
    status: JarvisStatus;
    error: string | null;
    messages: Message[];
    input: string;
    feedback: Record<string, FeedbackValue>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    fetchRecommendations: () => Promise<void>;
    handleSend: () => Promise<void>;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleFeedback: (rec: Recommendation, value: FeedbackValue) => Promise<void>;
    handleOpen: (url: string) => void;
}

// Local helper for "smart" replies (fallback when Ollama is disabled)
const getJarvisReply = async (text: string): Promise<{ text: string; action?: 'refresh' | 'history' }> => {
    const lower = text.toLowerCase();

    // Handle history queries
    if (lower.includes('history') || lower.includes('recent') || lower.includes('visited')) {
        try {
            if (window.arc && window.arc.getRecentHistory) {
                const history = await window.arc.getRecentHistory(5);
                if (history.length === 0) {
                    return {
                        text: "You haven't visited any sites yet. Start browsing and I'll remember where you've been!"
                    };
                }
                const historyText = history
                    .map((h, i) => `${i + 1}. ${h.title || h.url}`)
                    .join('\n');
                return {
                    text: `Here's your recent history:\n${historyText}`,
                    action: 'history'
                };
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
        return { text: "I couldn't retrieve your history right now." };
    }

    // Handle recommendation queries
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('refresh')) {
        return {
            text: "I've updated your recommendations based on where you've been browsing.",
            action: 'refresh'
        };
    }

    return {
        text: "I'm still learning to chat. Try asking for 'history' or 'recommendations'!"
    };
};

export const useJarvisController = (onNavigate?: (url: string) => void): JarvisController => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [status, setStatus] = useState<JarvisStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState<Record<string, FeedbackValue>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchRecommendations = async () => {
        console.log('💡 [Controller] Fetching recommendations...');
        setStatus('thinking');
        setError(null);
        try {
            if (window.arc && window.arc.getJarvisRecommendations) {
                const recs = await window.arc.getJarvisRecommendations();
                console.log(`💡 [Controller] Received ${recs.length} recommendations`);
                setRecommendations(recs);
                setStatus('idle');
            } else {
                console.warn('⚠️ [Controller] Jarvis API not available');
                setStatus('error');
                setError('Jarvis API missing');
            }
        } catch (err) {
            console.error('❌ [Controller] Failed to load recommendations:', err);
            setStatus('error');
            setError('Could not reach Jarvis.');
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        const newMessages = [...messages, { from: 'user' as const, text: userText }];
        setMessages(newMessages);
        setInput('');
        
        // Reset textarea height
        const textarea = document.querySelector('.jarvis-panel textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.style.height = 'auto';
        }

        setStatus('thinking');

        try {
            console.log('💬 [UI] Sending chat message:', userText.substring(0, 50) + '...');
            
            // Check if jarvisChat API is available
            if (window.arc && window.arc.jarvisChat) {
                console.log('💬 [UI] Using IPC jarvisChat API');
                
                const result = await window.arc.jarvisChat(newMessages);
                
                console.log('💬 [UI] Chat result:', {
                    ok: result.ok,
                    useFallback: result.useFallback,
                    hasReply: !!result.reply,
                    hasError: !!result.error
                });
                
                // Handle error response
                if (!result.ok) {
                    console.error('❌ [UI] Chat request failed:', result.error);
                    const errorMessage = result.error 
                        ? `Error: ${result.error}`
                        : 'Sorry, I encountered an error. Please try again.';
                    
                    setMessages(prev => [...prev, { 
                        from: 'jarvis', 
                        text: errorMessage
                    }]);
                    setStatus('error');
                    return;
                }
                
                // Handle fallback mode
                if (result.useFallback) {
                    console.log('💬 [UI] Using fallback mode');
                    
                    // Show error message if provided
                    if (result.reply) {
                        console.log('💬 [UI] Showing error message:', result.reply);
                        setMessages(prev => [...prev, { from: 'jarvis', text: result.reply }]);
                    }
                    
                    // Then provide fallback response
                    setTimeout(async () => {
                        console.log('💬 [UI] Getting fallback response');
                        const fallbackReply = await getJarvisReply(userText);
                        setMessages(prev => [...prev, { from: 'jarvis', text: fallbackReply.text }]);
                        
                        if (fallbackReply.action === 'refresh') {
                            fetchRecommendations();
                        } else {
                            setStatus('idle');
                        }
                    }, 500);
                } else {
                    // Success - show AI response
                    console.log('✅ [UI] AI response received');
                    setMessages(prev => [...prev, { from: 'jarvis', text: result.reply }]);
                    setStatus('idle');
                }
            } else {
                console.warn('⚠️ [UI] jarvisChat API not available, using local fallback');
                
                // Fallback to local rule-based responses
                setTimeout(async () => {
                    const reply = await getJarvisReply(userText);
                    setMessages(prev => [...prev, { from: 'jarvis', text: reply.text }]);

                    if (reply.action === 'refresh') {
                        fetchRecommendations();
                    } else {
                        setStatus('idle');
                    }
                }, 600);
            }
        } catch (error) {
            console.error('❌ Error in handleSend:', error);
            setMessages(prev => [...prev, { 
                from: 'jarvis', 
                text: 'Sorry, I encountered an unexpected error. Please try again.' 
            }]);
            setStatus('error');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        
        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        // Shift+Enter allows newline (default textarea behavior)
    };

    const handleFeedback = async (rec: Recommendation, value: FeedbackValue) => {
        console.log(`👍 [Controller] Feedback: ${value} for ${rec.url}`);
        // Update local state
        setFeedback(prev => ({ ...prev, [rec.url]: value }));

        // Send to backend (if available)
        try {
            if (window.arc && window.arc.sendJarvisFeedback) {
                await window.arc.sendJarvisFeedback({
                    id: rec.id,
                    url: rec.url,
                    value,
                    created_at: Date.now()
                });
                console.log(`✅ [Controller] Feedback sent successfully`);
            } else {
                console.warn('⚠️ [Controller] sendJarvisFeedback API not available');
            }
        } catch (error) {
            console.error('❌ [Controller] Failed to send feedback:', error);
        }
    };

    const handleOpen = (url: string) => {
        console.log('🔗 [Controller] Opening recommendation:', url);
        if (onNavigate) {
            console.log('🔗 [Controller] Using onNavigate callback');
            onNavigate(url);
        } else if (window.arc) {
            console.log('🔗 [Controller] Using window.arc.navigate');
            window.arc.navigate(url);
        } else {
            console.error('❌ [Controller] No navigation method available');
        }
    };

    // Scroll to bottom of chat
    useEffect(() => {
        // Check if scrollIntoView is available (not available in test environments)
        if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return {
        recommendations,
        status,
        error,
        messages,
        input,
        feedback,
        messagesEndRef,
        fetchRecommendations,
        handleSend,
        handleInputChange,
        handleKeyDown,
        handleFeedback,
        handleOpen
    };
};