/**
 * Voice Microphone Button Component
 * Floating microphone button for voice command activation
 */

import React, { useState, useRef, useEffect } from 'react';
import VoiceController, { VoiceState, VoiceControllerHandle } from './VoiceController';
import VoiceFeedbackUI from './VoiceFeedbackUI';
import { processVoiceInput, getAvailableVoiceCommands } from '../../core/voiceCommands';
import { useDebug } from '../contexts/DebugContext';

export interface VoiceMicrophoneButtonProps {
  enabled?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showHelp?: boolean;
}

const VoiceMicrophoneButton: React.FC<VoiceMicrophoneButtonProps> = ({
  enabled = true,
  position = 'bottom-right',
  showHelp = true
}) => {
  const { logAction } = useDebug();
  
  // State management
  const [state, setState] = useState<VoiceState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Refs
  const voiceControllerRef = useRef<VoiceControllerHandle>(null);
  
  // Get position styles
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 999,
      width: '56px',
      height: '56px'
    };
    
    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '24px', right: '24px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '24px', left: '24px' };
      case 'top-right':
        return { ...baseStyles, top: '24px', right: '24px' };
      case 'top-left':
        return { ...baseStyles, top: '24px', left: '24px' };
      default:
        return { ...baseStyles, bottom: '24px', right: '24px' };
    }
  };

  // Handle voice command processing
  const handleVoiceCommand = async (command: string, commandConfidence: number) => {
    console.log('🎤 [UI] Voice command received:', command, 'confidence:', commandConfidence);
    
    setLastCommand(command);
    setConfidence(commandConfidence);
    
    try {
      // Process the voice command
      const commandResult = await processVoiceInput(command);
      
      console.log('🎤 [UI] Command result:', commandResult);
      
      setResult(commandResult);
      logAction(`Voice command processed: "${command}" - ${commandResult.success ? 'Success' : 'Failed'}`);
      
      // Show success/error feedback
      if (commandResult.success) {
        logAction(`Voice command executed successfully: ${command}`);
      } else {
        logAction(`Voice command failed: ${commandResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🎤 [UI] Voice command processing error:', error);
      
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0
      };
      
      setResult(errorResult);
      logAction(`Voice command error: ${errorResult.error}`);
    }
  };

  // Handle state changes
  const handleStateChange = (newState: VoiceState) => {
    console.log('🎤 [UI] Voice state changed:', newState);
    setState(newState);
    
    if (newState === 'listening') {
      setIsListening(true);
      setResult(null); // Clear previous results
    } else if (newState === 'idle') {
      setIsListening(false);
    }
  };

  // Handle errors
  const handleError = (error: string) => {
    console.error('🎤 [UI] Voice error:', error);
    logAction(`Voice error: ${error}`);
    
    setResult({
      success: false,
      error,
      executionTime: 0
    });
  };

  // Toggle listening
  const toggleListening = () => {
    if (!enabled) {
      handleError('Voice commands are disabled');
      return;
    }
    
    if (isListening) {
      voiceControllerRef.current?.stopListening();
      logAction('Voice listening stopped manually');
    } else {
      voiceControllerRef.current?.startListening();
      logAction('Voice listening started manually');
    }
  };

  // Get button styling based on state
  const getButtonStyles = () => {
    const baseStyles = {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: 'none',
      cursor: enabled ? 'pointer' : 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      opacity: enabled ? 1 : 0.5,
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    };
    
    switch (state) {
      case 'listening':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.3)',
          animation: 'voicePulse 1.5s ease-in-out infinite'
        };
      case 'processing':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
        };
      case 'error':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
        };
      default:
        return {
          ...baseStyles,
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'var(--text-primary)',
          border: '2px solid rgba(255, 255, 255, 0.2)'
        };
    }
  };

  // Get button icon based on state
  const getButtonIcon = () => {
    switch (state) {
      case 'listening':
        return '🎤';
      case 'processing':
        return '⚡';
      case 'error':
        return '❌';
      default:
        return '🎤';
    }
  };

  // Get button tooltip
  const getTooltip = () => {
    switch (state) {
      case 'listening':
        return 'Listening... Click to stop';
      case 'processing':
        return 'Processing command...';
      case 'error':
        return 'Voice error - Click to retry';
      default:
        return enabled ? 'Click to start voice commands' : 'Voice commands disabled';
    }
  };

  // Don't render if not supported
  const isSupported = !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Voice Controller (hidden) */}
      <VoiceController
        ref={voiceControllerRef}
        onCommand={handleVoiceCommand}
        onStateChange={handleStateChange}
        onError={handleError}
        enabled={enabled}
        language="en-US"
        continuous={false}
        interimResults={true}
      />

      {/* Voice Feedback UI */}
      <VoiceFeedbackUI
        state={state}
        isListening={isListening}
        lastCommand={lastCommand}
        confidence={confidence}
        result={result}
        onDismiss={() => setResult(null)}
      />

      {/* Floating Microphone Button */}
      <div style={getPositionStyles()}>
        <button
          style={getButtonStyles()}
          onClick={toggleListening}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={!enabled}
          title={getTooltip()}
          aria-label={getTooltip()}
          aria-pressed={isListening}
        >
          {getButtonIcon()}
        </button>

        {/* Help Button */}
        {showHelp && (
          <button
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowHelpPanel(!showHelpPanel);
              logAction('Voice help panel toggled');
            }}
            title="Voice commands help"
            aria-label="Show voice commands help"
          >
            ?
          </button>
        )}
      </div>

      {/* Help Panel */}
      {showHelpPanel && (
        <div
          style={{
            position: 'fixed',
            bottom: position.includes('bottom') ? '90px' : 'auto',
            top: position.includes('top') ? '90px' : 'auto',
            right: position.includes('right') ? '24px' : 'auto',
            left: position.includes('left') ? '24px' : 'auto',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '300px',
            maxHeight: '400px',
            overflowY: 'auto',
            color: 'white',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
          role="dialog"
          aria-labelledby="voice-help-title"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 id="voice-help-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Voice Commands
            </h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px'
              }}
              onClick={() => setShowHelpPanel(false)}
              aria-label="Close help panel"
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '12px' }}>
            Click the microphone and say one of these commands:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {getAvailableVoiceCommands()
              .filter(cmd => cmd.examples.length > 0)
              .slice(0, 10) // Show first 10 commands
              .map((cmd, index) => (
                <div key={cmd.id} style={{ 
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {cmd.description}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Say: "{cmd.examples[0]}"
                  </div>
                </div>
              ))}
          </div>

          <div style={{ 
            marginTop: '12px', 
            padding: '8px',
            background: 'rgba(59, 130, 246, 0.2)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#93c5fd'
          }}>
            💡 Tip: Speak clearly and wait for the blue pulse to indicate listening.
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes voicePulse {
          0%, 100% {
            transform: scale(${isHovered ? '1.1' : '1'});
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            transform: scale(${isHovered ? '1.15' : '1.05'});
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>
    </>
  );
};

export default VoiceMicrophoneButton;