import React, { useRef, useState, useCallback, useEffect } from 'react';
import { DrawSettings, Point, Stroke, GestureMode, HandData, Particle } from '../types';

export function useCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  settings: DrawSettings,
  onModeChange: (mode: GestureMode) => void
) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastUndoTime = useRef(0);
  const lastSelectTime = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const wasPinchingRef = useRef(false);
  const pinchCenterRef = useRef<Point | null>(null);
  
  const [selection, setSelection] = useState<{
    strokeId: string;
    initialPinchCenter: Point;
    initialTransform: { scale: number; translateX: number; translateY: number };
  } | null>(null);

  const [mode, setMode] = useState<GestureMode>('IDLE');

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;

      ctx.save();
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      stroke.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
      const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

      ctx.translate(pivot.x + stroke.transform.translateX, pivot.y + stroke.transform.translateY);
      ctx.scale(stroke.transform.scale, stroke.transform.scale);
      ctx.translate(-pivot.x, -pivot.y);

      ctx.beginPath();
      if (stroke.points.length > 2) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
        }
        ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
      } else if (stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        if (stroke.points.length === 2) {
          ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        } else {
          ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
        }
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity / 100;
      
      if (stroke.glow > 0) {
        ctx.shadowBlur = stroke.glow * 0.3;
        ctx.shadowColor = stroke.color;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.stroke();

      if (selection?.strokeId === stroke.id) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        const padding = stroke.brushSize / 2 + 10;
        
        ctx.beginPath();
        const r = 8;
        ctx.roundRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2, r);
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        const handles = [
          [minX - padding, minY - padding],
          [maxX + padding, minY - padding],
          [minX - padding, maxY + padding],
          [maxX + padding, maxY + padding]
        ];
        handles.forEach(([hx, hy]) => {
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();
    });

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const stroke = currentStrokeRef.current;
      ctx.save();
      ctx.beginPath();
      if (stroke.points.length > 2) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
        }
        ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
      } else if (stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        if (stroke.points.length === 2) {
          ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        } else {
          ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
        }
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity / 100;
      if (stroke.glow > 0) {
        ctx.shadowBlur = stroke.glow * 0.3;
        ctx.shadowColor = stroke.color;
      }
      ctx.stroke();
      ctx.restore();
    }

    if (mode === 'SELECTING' && pinchCenterRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pinchCenterRef.current.x, pinchCenterRef.current.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = (p.life / p.maxLife) * 0.8;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    });

  }, [strokes, selection]);

  useEffect(() => {
    render();
  }, [render]);

  const handleHandUpdate = useCallback((hand: HandData | null) => {
    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      return p.life > 0;
    });

    if (!hand) {
      if (currentStrokeRef.current) {
        const strokeToAdd = currentStrokeRef.current;
        setStrokes(prev => [...prev, strokeToAdd]);
        currentStrokeRef.current = null;
      }
      setMode('IDLE');
      onModeChange('IDLE');
      render();
      return;
    }

    const { indexTip, thumbTip, pinchDist, indexUp, middleUp, ringUp, pinkyUp, isPinching } = hand as any;
    
    // Convert to client coordinates for UI collision
    const clientX = indexTip.x;
    const clientY = indexTip.y;
    
    let isHoveringBtn = false;
    let clickedBtn: HTMLElement | null = null;
    
    const guiElements = document.querySelectorAll('.gesture-btn');
    guiElements.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const pad = 25; // padding for easier targeting
      if (
        clientX >= rect.left - pad && clientX <= rect.right + pad &&
        clientY >= rect.top - pad && clientY <= rect.bottom + pad
      ) {
        isHoveringBtn = true;
        btn.classList.add('hovered-gesture-btn');
        if (isPinching && !wasPinchingRef.current) {
          clickedBtn = btn as HTMLElement;
        }
      } else {
        btn.classList.remove('hovered-gesture-btn');
      }
    });

    if (clickedBtn) {
      (clickedBtn as HTMLElement).click();
    }
    
    wasPinchingRef.current = isPinching;

    if (isHoveringBtn) {
      if (currentStrokeRef.current) {
        setStrokes(prev => [...prev, currentStrokeRef.current!]);
        currentStrokeRef.current = null;
      }
      setMode('IDLE');
      onModeChange('IDLE');
      render();
      return;
    }

    const pinchCenter = {
      x: (indexTip.x + thumbTip.x) / 2,
      y: (indexTip.y + thumbTip.y) / 2
    };

    let newMode = mode;

    if (isPinching) {
      pinchCenterRef.current = pinchCenter;
      const isNewPinch = mode !== 'SELECTING';

      if (isNewPinch) {
        let nearestId: string | null = null;
        let minDist = Infinity;
        strokes.forEach(s => {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          s.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          });
          const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

          s.points.forEach(p => {
            const tx = (p.x - pivot.x) * s.transform.scale + pivot.x + s.transform.translateX;
            const ty = (p.y - pivot.y) * s.transform.scale + pivot.y + s.transform.translateY;
            const d = Math.hypot(tx - pinchCenter.x, ty - pinchCenter.y);
            if (d < minDist) {
              minDist = d;
              nearestId = s.id;
            }
          });
        });
        
        if (nearestId && minDist < 60) {
          newMode = 'SELECTING';
          const stroke = strokes.find(s => s.id === nearestId);
          setSelection({
            strokeId: nearestId,
            initialPinchCenter: pinchCenter,
            initialTransform: { ...stroke!.transform }
          });
        } else {
          setSelection(null);
          pinchCenterRef.current = null;
          newMode = 'IDLE';
        }
      } else {
        newMode = 'SELECTING';
        if (selection) {
          const dx = pinchCenter.x - selection.initialPinchCenter.x;
          const dy = pinchCenter.y - selection.initialPinchCenter.y;
          setStrokes(prev => prev.map(s => {
            if (s.id === selection.strokeId) {
              return { ...s, transform: { ...s.transform, translateX: selection.initialTransform.translateX + dx, translateY: selection.initialTransform.translateY + dy } };
            }
            return s;
          }));
        }
      }
    } else {
      pinchCenterRef.current = null;
      
      if (indexUp && pinkyUp && !middleUp && !ringUp) {
        newMode = 'UNDO';
        const now = Date.now();
        if (now - lastUndoTime.current > 1000) {
          setStrokes(prev => {
            const newStrokes = [...prev];
            const popped = newStrokes.pop();
            if (popped) setRedoStack(r => [...r, popped]);
            return newStrokes;
          });
          lastUndoTime.current = now;
        }
      } else if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
        newMode = 'FREEZE';
        if (currentStrokeRef.current) {
          const strokeToAdd = currentStrokeRef.current;
          setStrokes(prev => [...prev, strokeToAdd]);
          currentStrokeRef.current = null;
        }
      } else if (indexUp && middleUp) {
        newMode = 'PEN_LIFTED';
        if (selection) setSelection(null);
        if (currentStrokeRef.current) {
          const strokeToAdd = currentStrokeRef.current;
          setStrokes(prev => [...prev, strokeToAdd]);
          currentStrokeRef.current = null;
        }
      } else if (indexUp && !middleUp && !ringUp && !pinkyUp && !isPinching) {
        if (selection) setSelection(null);
        
        if (settings.mode === 'erase') {
          newMode = 'ERASING';
          
          setStrokes(prev => prev.filter(s => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            s.points.forEach(p => {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            });
            const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

            const hit = s.points.some(p => {
              const tx = (p.x - pivot.x) * s.transform.scale + pivot.x + s.transform.translateX;
              const ty = (p.y - pivot.y) * s.transform.scale + pivot.y + s.transform.translateY;
              const d = Math.hypot(tx - indexTip.x, ty - indexTip.y);
              return d < s.brushSize * s.transform.scale + 20; // 20px erase radius padding
            });
            return !hit; // Keep strokes that are NOT hit
          }));

          // Eraser particles
          if (Math.random() > 0.5) {
            particlesRef.current.push({
              x: indexTip.x + (Math.random() - 0.5) * 20,
              y: indexTip.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 20,
              maxLife: 20,
              color: 'rgba(255,255,255,0.8)',
              size: Math.random() * 3 + 2
            });
          }
          
        } else {
          newMode = 'DRAWING';
          
          // Spawn bubbles
          if (Math.random() > 0.3) {
            particlesRef.current.push({
              x: indexTip.x + (Math.random() - 0.5) * 10,
              y: indexTip.y + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 2,
              vy: Math.random() * -3 - 1,
              life: 30,
              maxLife: 30,
              color: settings.color,
              size: Math.random() * 4 + 2
            });
          }

          if (!currentStrokeRef.current) {
            currentStrokeRef.current = {
              id: Math.random().toString(36).substr(2, 9),
              points: [indexTip],
              color: settings.color,
              brushSize: settings.brushSize,
              opacity: settings.opacity,
              glow: settings.glow,
              transform: { scale: 1, translateX: 0, translateY: 0 }
            };
            setRedoStack([]);
          } else {
            const lastPoint = currentStrokeRef.current.points[currentStrokeRef.current.points.length - 1];
            const dx = indexTip.x - lastPoint.x;
            const dy = indexTip.y - lastPoint.y;
            const dist = Math.hypot(dx, dy);
            
            // Only add point if it moved a minimum distance to reduce jitter
            if (dist > 3) {
              // Apply slight smoothing (EMA)
              const smoothedPoint = {
                x: lastPoint.x + dx * 0.6,
                y: lastPoint.y + dy * 0.6
              };
              currentStrokeRef.current.points.push(smoothedPoint);
            }
          }
        }
      } else {
        newMode = 'IDLE';
        if (currentStrokeRef.current) {
          const strokeToAdd = currentStrokeRef.current;
          setStrokes(prev => [...prev, strokeToAdd]);
          currentStrokeRef.current = null;
        }
      }
    }

    if (newMode !== mode) {
      setMode(newMode);
      onModeChange(newMode);
    }
    
    render();
  }, [mode, strokes, selection, settings, onModeChange, render]);

  const clearCanvas = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
    render();
  }, [render]);

  const undo = useCallback(() => {
    setStrokes(prev => {
      const newStrokes = [...prev];
      const popped = newStrokes.pop();
      if (popped) setRedoStack(r => [...r, popped]);
      return newStrokes;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      const newRedo = [...prev];
      const popped = newRedo.pop();
      if (popped) setStrokes(s => [...s, popped]);
      return newRedo;
    });
  }, []);

  const download = useCallback((videoElement: HTMLVideoElement | null, dimLevel: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (videoElement) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (dimLevel > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${dimLevel / 100})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      ctx.save();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      stroke.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
      const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      ctx.translate(pivot.x + stroke.transform.translateX, pivot.y + stroke.transform.translateY);
      ctx.scale(stroke.transform.scale, stroke.transform.scale);
      ctx.translate(-pivot.x, -pivot.y);

      ctx.beginPath();
      if (stroke.points.length > 2) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
        }
        ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
      } else if (stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        if (stroke.points.length === 2) {
          ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        } else {
          ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
        }
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity / 100;
      if (stroke.glow > 0) {
        ctx.shadowBlur = stroke.glow * 0.3;
        ctx.shadowColor = stroke.color;
      }
      ctx.stroke();
      ctx.restore();
    });

    const link = document.createElement('a');
    link.download = 'airdraw-capture.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [strokes]);

  return { undo, redo, clearCanvas, download, handleHandUpdate };
}
