import React, { useEffect, useRef } from 'react';
import { DrawSettings } from '../types';

interface SettingsPanelProps {
  settings: DrawSettings;
  setSettings: React.Dispatch<React.SetStateAction<DrawSettings>>;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  onClose: () => void;
  isDesktop: boolean;
}

const COLORS = [
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FF0000', // Red
  '#FFFF00', // Yellow
  '#800080', // Purple
  '#FFFFFF', // White
  '#FFA500', // Orange
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
  onUndo,
  onRedo,
  onClear,
  onDownload,
  onClose,
  isDesktop
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDesktop) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const target = event.target as Element;
        if (!target.closest('.settings-button')) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isDesktop]);

  return (
    <div className={`settings-panel ${isDesktop ? 'desktop' : ''}`} ref={panelRef}>
      <div className="panel-section" style={{ marginTop: isDesktop ? 0 : undefined }}>
        <label>Colors</label>
        <div className="color-palette">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`color-swatch ${settings.color === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSettings((s) => ({ ...s, color }))}
            />
          ))}
          <div className={`color-swatch custom-color-wrapper ${!COLORS.includes(settings.color) ? 'selected' : ''}`}>
            <input 
              type="color" 
              value={settings.color} 
              onChange={(e) => setSettings((s) => ({ ...s, color: e.target.value }))}
              className="custom-color-input"
              title="Custom Color"
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label>Brush Thickness: {settings.brushSize}px</label>
        <div className="slider-container">
          <input
            type="range"
            min="2"
            max="30"
            value={settings.brushSize}
            onChange={(e) => setSettings((s) => ({ ...s, brushSize: parseInt(e.target.value) }))}
            className="custom-slider"
          />
        </div>
      </div>

      <div className="panel-section">
        <label>Glow Effect: {settings.glow}%</label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.glow}
            onChange={(e) => setSettings((s) => ({ ...s, glow: parseInt(e.target.value) }))}
            className="custom-slider"
          />
        </div>
      </div>

      <div className="panel-section brush-preview-section">
        <label>Brush Preview</label>
        <div className="brush-preview-container">
          <div 
            className="brush-preview-dot"
            style={{
              width: `${settings.brushSize}px`,
              height: `${settings.brushSize}px`,
              backgroundColor: settings.color,
              opacity: settings.opacity / 100,
              boxShadow: settings.glow > 0 ? `0 0 ${settings.glow * 0.3}px ${settings.color}` : 'none'
            }}
          />
        </div>
      </div>

      <div className="panel-actions-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="pill-btn danger" onClick={onClear} style={{ flex: 1, minWidth: '45%' }}>
          <div className="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </div>
          <span>Clear All</span>
        </button>

        <button className="pill-btn" onClick={onDownload} style={{ flex: 1, minWidth: '45%' }}>
          <div className="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </div>
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};
