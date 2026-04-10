export type DrawMode = 'draw' | 'erase';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  brushSize: number;
  opacity: number;
  glow: number;
  transform: {
    scale: number;
    translateX: number;
    translateY: number;
  };
}

export interface DrawSettings {
  color: string;
  brushSize: number;
  opacity: number;
  glow: number;
  mode: DrawMode;
  dimLevel: number;
  gestureControl: boolean;
}

export interface HandData {
  indexTip: Point;
  thumbTip: Point;
  middleTip: Point;
  pinchDist: number;
  indexUp: boolean;
  middleUp: boolean;
  ringUp: boolean;
  pinkyUp: boolean;
  isPinching: boolean;
}

export type GestureMode = 'IDLE' | 'DRAWING' | 'PEN_LIFTED' | 'ERASING' | 'SELECTING' | 'UNDO' | 'FREEZE';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}
