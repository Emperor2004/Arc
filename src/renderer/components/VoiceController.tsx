/**
 * Voice Controller Component
 * Handles audio capture and speech recognition using Web Speech API
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDebug } from '../contexts/DebugContext';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceControllerProps {
  onCommand?: (command: string, confidence: number) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface VoiceControllerHandle {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  state: VoiceState;
}

const VoiceController = React.forwardRef<VoiceControllerHandle, VoiceControllerProps>(({
  onCommand,
  onStateChange,
  onError,
  enabled = true,
  language = 'en-US',
  continuous = false,
  interimResults = true
}, ref) => {
  const { logAction } = useDebug();
  
  // State management
  const [state, setState] = useState<VoiceState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configuration
  const SILENCE_TIMEOUT = 3000; // 3 seconds of silence before stopping
  const MAX_LISTENING_TIME = 30000; // 30 seconds max listening time
  const MIN_CONFIDENCE = 0.7; // Minimum confidence threshold

  // Check browser support and initialize
  useEffect(() => {
    const checkSupport = () => {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('🎤 [Voice] Speech Recognition not supported in this browser');
        setIsSupported(false);
        return false;
      }
      
      setIsSupported(true);
      logAction('Voice recognition support detected');
      return true;
    };
    
    if (checkSupport()) {
      initializeSpeechRecognition();
    }
  }, [language, continuous, interimResults, logAction]);

  // Initialize Speech Recognition
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    
    // Configuration
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 3;
    
    // Event handlers
    recognition.onstart = () => {
      console.log('🎤 [Voice] Speech recognition started');
      setIsListening(true);
      setState('listening');
      onStateChange?.('listening');
      logAction('Voice recognition started');
      
      // Set maximum listening timeout
      timeoutRef.current = setTimeout(() => {
        stopListening();
        logAction('Voice recognition stopped due to timeout');
      }, MAX_LISTENING_TIME);
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('🎤 [Voice] Speech recognition result received');
      
      // Clear silence timeout since we got a result
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1];
      
      if (lastResult) {
        const transcript = lastResult[0].transcript.trim();
        const resultConfidence = lastResult[0].confidence || 0;
        
        console.log('🎤 [Voice] Transcript:', transcript, 'Confidence:', resultConfidence);
        
        setLastCommand(transcript);
        setConfidence(resultConfidence);
        
        // Only process final results with sufficient confidence
        if (lastResult.isFinal && resultConfidence >= MIN_CONFIDENCE) {
          setState('processing');
          onStateChange?.('processing');
          
          console.log('🎤 [Voice] Processing command:', transcript);
          logAction(`Voice command recognized: "${transcript}" (${Math.round(resultConfidence * 100)}%)`);
          
          onCommand?.(transcript, resultConfidence);
          
          // Stop listening after processing command (for single command mode)
          if (!continuous) {
            setTimeout(() => stopListening(), 500);
          }
        } else if (!lastResult.isFinal) {
          // Handle interim results for real-time feedback
          logAction(`Voice interim result: "${transcript}"`);
        }
      }
      
      // Set silence timeout for continuous mode
      if (continuous) {
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('🎤 [Voice] Stopping due to silence');
          stopListening();
        }, SILENCE_TIMEOUT);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🎤 [Voice] Speech recognition error:', event.error);
      
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          setHasPermission(false);
          break;
        case 'network':
          errorMessage = 'Network error during speech recognition.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setState('error');
      onStateChange?.('error');
      onError?.(errorMessage);
      logAction(`Voice recognition error: ${errorMessage}`);
      
      setIsListening(false);
    };
    
    recognition.onend = () => {
      console.log('🎤 [Voice] Speech recognition ended');
      setIsListening(false);
      setState('idle');
      onStateChange?.('idle');
      logAction('Voice recognition ended');
      
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };
    
    recognitionRef.current = recognition;
  }, [language, continuous, interimResults, onCommand, onStateChange, onError, logAction]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎤 [Voice] Requesting microphone permission');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      logAction('Microphone permission granted');
      return true;
    } catch (error) {
      console.error('🎤 [Voice] Microphone permission denied:', error);
      setHasPermission(false);
      onError?.('Microphone permission is required for voice commands');
      logAction('Microphone permission denied');
      return false;
    }
  }, [onError, logAction]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported) {
      onError?.('Speech recognition is not supported in this browser');
      return;
    }
    
    if (!enabled) {
      onError?.('Voice commands are disabled');
      return;
    }
    
    if (isListening) {
      console.log('🎤 [Voice] Already listening');
      return;
    }
    
    // Check permission first
    if (hasPermission === null) {
      const granted = await requestPermission();
      if (!granted) return;
    } else if (hasPermission === false) {
      onError?.('Microphone permission is required for voice commands');
      return;
    }
    
    if (!recognitionRef.current) {
      onError?.('Speech recognition not initialized');
      return;
    }
    
    try {
      console.log('🎤 [Voice] Starting speech recognition');
      recognitionRef.current.start();
    } catch (error) {
      console.error('🎤 [Voice] Failed to start recognition:', error);
      onError?.('Failed to start voice recognition');
      logAction(`Failed to start voice recognition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isSupported, enabled, isListening, hasPermission, requestPermission, onError, logAction]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) {
      return;
    }
    
    try {
      console.log('🎤 [Voice] Stopping speech recognition');
      recognitionRef.current.stop();
    } catch (error) {
      console.error('🎤 [Voice] Error stopping recognition:', error);
    }
  }, [isListening]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    isListening,
    state
  }));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  // Don't render anything if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="voice-controller" style={{ display: 'none' }}>
      {/* This component manages voice recognition but doesn't render UI */}
      {/* UI elements will be handled by parent components */}
    </div>
  );
});

VoiceController.displayName = 'VoiceController';

export default VoiceController;

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  
  start(): void;
  stop(): void;
  abort(): void;
  
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechGrammarList {
  readonly length: number;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};