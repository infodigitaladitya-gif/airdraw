import { useState, useRef, useEffect, useCallback } from 'react';
import { DrawSettings, GestureMode } from './types';
import { VideoCanvas, VideoCanvasHandle } from './components/VideoCanvas';
import { SettingsButton } from './components/SettingsButton';
import { SettingsPanel } from './components/SettingsPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { HowToUseModal } from './components/HowToUseModal';
import { Pencil, Undo2, Redo2, Eraser } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<DrawSettings>({
    color: '#00FFFF',
    brushSize: 8,
    opacity: 100,
    glow: 60,
    mode: 'draw',
    dimLevel: 0,
    gestureControl: false,
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [handCursor, setHandCursor] = useState<{x: number, y: number, isPinching: boolean, isVisible: boolean} | null>(null);
  const [gestureMode, setGestureMode] = useState<GestureMode>('IDLE');
  
  const [isLoading, setIsLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const videoCanvasRef = useRef<VideoCanvasHandle>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hasVisited = localStorage.getItem('airdraw_visited');
    if (!hasVisited) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    localStorage.setItem('airdraw_visited', 'true');
    setShowTutorial(false);
  };

  const handleUndo = () => videoCanvasRef.current?.undo();
  const handleRedo = () => videoCanvasRef.current?.redo();
  const handleClear = () => videoCanvasRef.current?.clearCanvas();
  const handleDownload = () => videoCanvasRef.current?.download();

  const handleReady = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <div className="app-container">
      {isLoading && <LoadingScreen />}
      
      {showTutorial && !isLoading && <HowToUseModal onClose={handleCloseTutorial} />}

      <VideoCanvas 
        ref={videoCanvasRef} 
        settings={settings} 
        onModeChange={setGestureMode}
        onHandCursorUpdate={setHandCursor}
        onReady={handleReady}
      />
      
      {/* Camera Indicator */}
      <div className="camera-indicator">
        <div className="dot"></div>
        Camera ON
      </div>

      {/* Social Pill */}
      <div className="social-pill">
        built by <strong>ADITYA Zen</strong>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </div>
      
      {!isPanelOpen && <SettingsButton onClick={() => setIsPanelOpen(true)} />}
      
      {isPanelOpen && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onDownload={handleDownload}
          onClose={() => setIsPanelOpen(false)}
          isDesktop={isDesktop}
        />
      )}

      {/* Gesture Controls Toolbar */}
      <div className={`fixed left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1e1e1e]/80 backdrop-blur-xl p-2 rounded-full border border-white/10 shadow-2xl z-40 transition-all duration-300 ${isPanelOpen ? 'bottom-24 md:bottom-8' : 'bottom-8'}`}>
        <button 
          className={`gesture-btn flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 ${settings.mode === 'draw' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          onClick={() => setSettings(s => ({ ...s, mode: 'draw' }))}
        >
          <Pencil className="w-5 h-5 pointer-events-none" />
          <span className="font-medium pointer-events-none">Draw</span>
        </button>
        
        <button 
          className="gesture-btn p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          onClick={handleUndo}
        >
          <Undo2 className="w-5 h-5 pointer-events-none" />
        </button>

        <button 
          className="gesture-btn p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          onClick={handleRedo}
        >
          <Redo2 className="w-5 h-5 pointer-events-none" />
        </button>

        <button 
          className={`gesture-btn flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 ${settings.mode === 'erase' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          onClick={() => setSettings(s => ({ ...s, mode: 'erase' }))}
        >
          <Eraser className="w-5 h-5 pointer-events-none" />
          <span className="font-medium pointer-events-none">Erase</span>
        </button>
      </div>

      {handCursor && handCursor.isVisible && (
        <div 
          className={`hand-cursor ${gestureMode.toLowerCase()} ${handCursor.isPinching ? 'pinching' : ''}`}
          style={{
            left: handCursor.x,
            top: handCursor.y,
          }}
        />
      )}
    </div>
  );
}
