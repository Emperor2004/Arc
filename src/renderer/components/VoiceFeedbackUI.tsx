/**
 * Voice Feedback UI Component
 * Provides visual feedback for voice command states and results
 */

import React, { useState, useEffect } from 'react';
import { VoiceState } from './VoiceController';

export interface VoiceFeedbackProps {
  state: VoiceState;
  isListening: boolean;
  lastCommand?: string;
  confidence?: number;
  result?: {
    success: boolean;
    error?: string;
    executionTime?: number;
  };
  onDismiss?: () => void;
}

const VoiceFeedbackUI: React.FC<VoiceFeedbackProps> = ({
  state,
  isListening,
  lastCommand,
  confidence,
  result,
  onDismiss
}) => {
  const [showResult, setShowResult] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  // Show result feedback when result changes
  useEffect(() => {
    if (result) {
      setShowResult(true);
      setAnimationClass('voice-feedback-enter');
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setAnimationClass('voice-feedback-exit');
        setTimeout(() => {
          setShowResult(false);
          onDismiss?.();
        }, 300);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [result, onDismiss]);

  // Get state-specific styling and content
  const getStateInfo = () => {
    switch (state) {
      case 'listening':
        return {
          color: '#3b82f6',
          icon: '🎤',
          text: 'Listening...',
          description: 'Speak your command',
          pulse: true
        };
      case 'processing':
        return {
          color: '#f59e0b',
          icon: '⚡',
          text: 'Processing...',
          description: lastCommand ? `"${lastCommand}"` : 'Analyzing command',
          pulse: false
        };
      case 'error':
        return {
          color: '#ef4444',
          icon: '❌',
          text: 'Error',
          description: 'Voice recognition failed',
          pulse: false
        };
      default:
        return {
          color: '#6b7280',
          icon: '🎤',
          text: 'Ready',
          description: 'Click to start voice commands',
          pulse: false
        };
    }
  };

  const stateInfo = getStateInfo();

  // Don't render if not listening and no result to show
  if (!isListening && !showResult && state === 'idle') {
    return null;
  }

  return (
    <>
      {/* Voice State Indicator */}
      {(isListening || state !== 'idle') && (
        <div 
          className={`voice-state-indicator ${stateInfo.pulse ? 'pulse' : ''}`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            border: `2px solid ${stateInfo.color}`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px ${stateInfo.color}40`,
            animation: isListening ? 'voiceFadeIn 0.3s ease-out' : undefined
          }}
          role="status"
          aria-live="polite"
          aria-label={`Voice command ${stateInfo.text.toLowerCase()}`}
        >
          <span 
            style={{ 
              fontSize: '16px',
              filter: stateInfo.pulse ? 'brightness(1.2)' : undefined
            }}
            aria-hidden="true"
          >
            {stateInfo.icon}
          </span>
          <div>
            <div style={{ color: stateInfo.color, fontWeight: 600 }}>
              {stateInfo.text}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#d1d5db',
              marginTop: '2px',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {stateInfo.description}
            </div>
            {confidence && confidence > 0 && (
              <div style={{ 
                fontSize: '11px', 
                color: '#9ca3af',
                marginTop: '2px'
              }}>
                Confidence: {Math.round(confidence * 100)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Command Result Feedback */}
      {showResult && result && (
        <div 
          className={`voice-result-feedback ${animationClass}`}
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            background: result.success 
              ? 'rgba(34, 197, 94, 0.9)' 
              : 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer'
          }}
          onClick={() => {
            setAnimationClass('voice-feedback-exit');
            setTimeout(() => {
              setShowResult(false);
              onDismiss?.();
            }, 300);
          }}
          role="alert"
          aria-live="assertive"
        >
          <span style={{ fontSize: '16px' }} aria-hidden="true">
            {result.success ? '✅' : '❌'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {result.success ? 'Command Executed' : 'Command Failed'}
            </div>
            {lastCommand && (
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.9,
                marginTop: '2px'
              }}>
                "{lastCommand}"
              </div>
            )}
            {result.error && (
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.9,
                marginTop: '2px'
              }}>
                {result.error}
              </div>
            )}
            {result.executionTime && (
              <div style={{ 
                fontSize: '11px', 
                opacity: 0.7,
                marginTop: '2px'
              }}>
                {result.executionTime}ms
              </div>
            )}
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              opacity: 0.7,
              padding: '4px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setAnimationClass('voice-feedback-exit');
              setTimeout(() => {
                setShowResult(false);
                onDismiss?.();
              }, 300);
            }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes voiceFadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes voicePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        .voice-state-indicator.pulse {
          animation: voicePulse 2s ease-in-out infinite;
        }

        .voice-feedback-enter {
          animation: voiceFeedbackEnter 0.3s ease-out;
        }

        .voice-feedback-exit {
          animation: voiceFeedbackExit 0.3s ease-in;
        }

        @keyframes voiceFeedbackEnter {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes voiceFeedbackExit {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
        }
      `}</style>
    </>
  );
};

export default VoiceFeedbackUI;