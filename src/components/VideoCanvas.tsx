import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { DrawSettings, Point, HandData, GestureMode } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { useMediaPipe } from '../hooks/useMediaPipe';

interface VideoCanvasProps {
  settings: DrawSettings;
  onModeChange: (mode: GestureMode) => void;
  onHandCursorUpdate: (cursor: {x: number, y: number, isPinching: boolean, isVisible: boolean} | null) => void;
  onReady: () => void;
}

export interface VideoCanvasHandle {
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  download: () => void;
}

export const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(({ settings, onModeChange, onHandCursorUpdate, onReady }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const { undo, redo, clearCanvas, download: canvasDownload, handleHandUpdate } = useCanvas(drawCanvasRef, settings, onModeChange);
  
  const onHandUpdate = useCallback((hand: HandData | null) => {
    handleHandUpdate(hand);
    
    if (hand) {
      let elements: Element[] = [];
      try {
        if (hand.indexTip.x >= 0 && hand.indexTip.x <= window.innerWidth && 
            hand.indexTip.y >= 0 && hand.indexTip.y <= window.innerHeight) {
          elements = document.elementsFromPoint(hand.indexTip.x, hand.indexTip.y) || [];
        }
      } catch (e) {
        console.warn("elementsFromPoint error:", e);
      }
      
      const isOverPanel = elements.some(el => el.classList.contains('settings-panel'));
      
      const isVisible = settings.gestureControl;

      onHandCursorUpdate({ x: hand.indexTip.x, y: hand.indexTip.y, isPinching: hand.isPinching, isVisible });

      if (hand.isPinching) {
        const clickable = elements.find(el => 
          el.tagName === 'BUTTON' || 
          el.tagName === 'INPUT' || 
          el.classList.contains('clickable') ||
          el.closest('button')
        );
        
        const buttonEl = clickable?.tagName === 'BUTTON' ? clickable : clickable?.closest('button');
        
        if (buttonEl && buttonEl instanceof HTMLElement) {
          if (settings.gestureControl) {
            buttonEl.click();
          }
        }
      }
    } else {
      onHandCursorUpdate(null);
    }
  }, [handleHandUpdate, onHandCursorUpdate, settings.gestureControl]);

  const { error, isReady } = useMediaPipe(videoRef, skeletonCanvasRef, settings, onHandUpdate);

  useEffect(() => {
    if (isReady) {
      onReady();
    }
  }, [isReady, onReady]);

  const download = useCallback(() => {
    canvasDownload(videoRef.current, settings.dimLevel);
  }, [canvasDownload, settings.dimLevel]);

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    clearCanvas,
    download
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return <div className="error-screen">{error}</div>;
  }

  const dimOpacity = settings.dimLevel === 4 ? 0.9 : settings.dimLevel * 0.25;

  return (
    <div className="video-canvas-container">
      <video
        ref={videoRef}
        className="video-layer"
        playsInline
        autoPlay
        muted
        style={{ zIndex: 0 }}
      />
      <div 
        className="dim-overlay" 
        style={{ 
          display: dimOpacity > 0 ? 'block' : 'none',
          opacity: dimOpacity, 
          position: 'absolute', 
          inset: 0, 
          backgroundColor: '#000', 
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease'
        }} 
      />
      <canvas
        ref={drawCanvasRef}
        className="canvas-layer"
        width={dimensions.width}
        height={dimensions.height}
        style={{ zIndex: 1 }}
      />
      <canvas
        ref={skeletonCanvasRef}
        className="canvas-layer"
        width={dimensions.width}
        height={dimensions.height}
        style={{ zIndex: 2 }}
      />
    </div>
  );
});

VideoCanvas.displayName = 'VideoCanvas';
