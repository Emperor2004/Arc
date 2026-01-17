import React, { useState, useEffect } from 'react';
import { useDebug } from '../contexts/DebugContext';
import { renderingDiagnostic, RenderingError } from '../utils/renderingDiagnostic';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentCount: number;
}

const DebugOverlay: React.FC = () => {
  // Debug overlay is disabled - return null to hide it completely
  return null;

};

export default DebugOverlay;