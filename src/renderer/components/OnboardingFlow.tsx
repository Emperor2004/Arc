import React, { useState, useEffect } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  actionText?: string;
  action?: () => void;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onCreateDemo?: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onComplete,
  onSkip,
  onCreateDemo
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(false);

  // Default steps (fallback if API fails)
  const defaultSteps: OnboardingStep[] = [
    {
      id: 'command-palette',
      title: 'Command Palette',
      description: 'Access everything with Ctrl+K',
      icon: '⌨️',
      content: 'Press Ctrl+K (or Cmd+K on Mac) to open the command palette. Search and execute any action instantly - create tabs, switch workspaces, analyze pages, and more.',
      actionText: 'Try it now'
    },
    {
      id: 'workspaces',
      title: 'Workspaces',
      description: 'Organize your browsing sessions',
      icon: '📁',
      content: 'Save your current tabs as a workspace to quickly switch between different projects or contexts. Perfect for separating work, research, and personal browsing.',
      actionText: 'Create workspace'
    },
    {
      id: 'jarvis-analysis',
      title: 'Jarvis Page Analysis',
      description: 'AI-powered content analysis',
      icon: '🤖',
      content: 'Jarvis can analyze, summarize, or explain any webpage content. Use the analysis buttons in the Jarvis panel or access them via the command palette.',
      actionText: 'Open Jarvis'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      // Use default steps for now
      // In a full implementation, this would load from the onboarding manager
      setSteps(defaultSteps);
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setLoading(true);
    // Mark onboarding as completed
    setTimeout(() => {
      onComplete();
      setLoading(false);
    }, 500);
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleStepAction = () => {
    const step = steps[currentStep];
    if (step.action) {
      step.action();
    } else {
      // Default actions based on step ID
      switch (step.id) {
        case 'command-palette':
          // Trigger command palette
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true
          });
          window.dispatchEvent(event);
          break;
        case 'workspaces':
          const workspaceEvent = new CustomEvent('arc:workspace-save');
          window.dispatchEvent(workspaceEvent);
          break;
        case 'jarvis-analysis':
          const jarvisInput = document.querySelector('#jarvis-input') as HTMLTextAreaElement;
          if (jarvisInput) {
            jarvisInput.focus();
            jarvisInput.scrollIntoView({ behavior: 'smooth' });
          }
          break;
      }
    }
  };

  if (!isOpen || steps.length === 0) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1000 }}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ 
        maxWidth: '500px', 
        width: '90vw',
        animation: 'slideInUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div className="modal-header" style={{ textAlign: 'center', paddingBottom: '16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            Welcome to Arc Browser
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Let's get you started with the key features
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ 
          marginBottom: '24px',
          padding: '0 4px'
        }}>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="modal-body" style={{ padding: '0 0 24px 0', textAlign: 'center' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}>
            {currentStepData.icon}
          </div>
          
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '20px', 
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            {currentStepData.title}
          </h3>
          
          <p style={{ 
            margin: '0 0 16px 0', 
            fontSize: '14px', 
            color: 'var(--accent)',
            fontWeight: 500
          }}>
            {currentStepData.description}
          </p>
          
          <p style={{ 
            margin: '0 0 24px 0', 
            fontSize: '14px', 
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            textAlign: 'left',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)'
          }}>
            {currentStepData.content}
          </p>

          {/* Step Action Button */}
          {currentStepData.actionText && (
            <button
              className="btn-secondary"
              onClick={handleStepAction}
              style={{
                marginBottom: '16px',
                padding: '8px 16px',
                fontSize: '13px'
              }}
            >
              {currentStepData.actionText}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              onClick={handleSkip}
              style={{ fontSize: '13px' }}
            >
              Skip Tour
            </button>
            {onCreateDemo && (
              <button 
                className="btn-secondary" 
                onClick={onCreateDemo}
                style={{ fontSize: '13px' }}
              >
                Create Demo
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button 
                className="btn-secondary" 
                onClick={handlePrevious}
                style={{ fontSize: '13px' }}
              >
                Previous
              </button>
            )}
            <button 
              className="btn-primary" 
              onClick={handleNext}
              disabled={loading}
              style={{ fontSize: '13px', minWidth: '80px' }}
            >
              {loading ? '...' : currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        
        .modal-content {
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default OnboardingFlow;