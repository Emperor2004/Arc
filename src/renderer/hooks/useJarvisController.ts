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

// Local helper for "smart" replies
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
        setStatus('thinking');
        setError(null);
        try {
            if (window.arc && window.arc.getJarvisRecommendations) {
                const recs = await window.arc.getJarvisRecommendations();
                setRecommendations(recs);
                setStatus('idle');
            } else {
                console.warn('Jarvis API not available');
                setStatus('error');
                setError('Jarvis API missing');
            }
        } catch (err) {
            console.error('Failed to load recommendations:', err);
            setStatus('error');
            setError('Could not reach Jarvis.');
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { from: 'user', text: userText }]);
        setInput('');
        
        // Reset textarea height
        const textarea = document.querySelector('.jarvis-panel textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.style.height = 'auto';
        }

        setStatus('thinking');

        // Simulate thinking delay
        setTimeout(async () => {
            const reply = await getJarvisReply(userText);
            setMessages(prev => [...prev, { from: 'jarvis', text: reply.text }]);

            if (reply.action === 'refresh') {
                fetchRecommendations();
            } else {
                setStatus('idle');
            }
        }, 600);
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
                console.log(`Feedback sent: ${value} for ${rec.url}`);
            } else {
                console.warn('sendJarvisFeedback API not available');
            }
        } catch (error) {
            console.error('Failed to send feedback:', error);
        }
    };

    const handleOpen = (url: string) => {
        if (onNavigate) {
            onNavigate(url);
        } else if (window.arc) {
            window.arc.navigate(url);
        }
    };

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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