import React, { useEffect, useRef, useState } from 'react';
import { DrawSettings, Point, HandData } from '../types';

const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number, getPt: (idx: number) => Point) => {
  ctx.clearRect(0, 0, width, height);

  const drawLine = (p1: number, p2: number) => {
    const pt1 = getPt(p1);
    const pt2 = getPt(p2);
    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
  };

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;

  // Wrist to fingers
  drawLine(0, 1); drawLine(0, 5); drawLine(0, 9); drawLine(0, 13); drawLine(0, 17);
  // Thumb
  drawLine(1, 2); drawLine(2, 3); drawLine(3, 4);
  // Index
  drawLine(5, 6); drawLine(6, 7); drawLine(7, 8);
  // Middle
  drawLine(9, 10); drawLine(10, 11); drawLine(11, 12);
  // Ring
  drawLine(13, 14); drawLine(14, 15); drawLine(15, 16);
  // Pinky
  drawLine(17, 18); drawLine(18, 19); drawLine(19, 20);
  // Palm
  drawLine(5, 9); drawLine(9, 13); drawLine(13, 17);

  // Dots
  ctx.fillStyle = 'white';
  ctx.shadowBlur = 4; // White glow
  ctx.shadowColor = 'white';
  for (let i = 0; i < 21; i++) {
    const pt = getPt(i);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI); // Radius 2px
    ctx.fill();
  }
};

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  skeletonCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  settings: DrawSettings,
  onHandUpdate: (hand: HandData | null) => void
) {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  const onHandUpdateRef = useRef(onHandUpdate);
  useEffect(() => {
    onHandUpdateRef.current = onHandUpdate;
  }, [onHandUpdate]);

  useEffect(() => {
    if (!videoRef.current || !skeletonCanvasRef.current || !window.Hands || !window.Camera) {
      if (!window.Hands || !window.Camera) {
        setError("MediaPipe not loaded");
      }
      return;
    }

    const videoElement = videoRef.current;
    const canvasElement = skeletonCanvasRef.current;

    const onResults = (results: any) => {
      if (!canvasElement) return;

      const skeletonCtx = canvasElement.getContext('2d');
      if (skeletonCtx) {
        skeletonCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        onHandUpdateRef.current(null);
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      
      const canvasWidth = canvasElement.width;
      const canvasHeight = canvasElement.height;

      const getPt = (idx: number) => ({
        x: (1 - landmarks[idx].x) * canvasWidth,
        y: landmarks[idx].y * canvasHeight
      });

      if (skeletonCtx) {
        drawSkeleton(skeletonCtx, landmarks, canvasWidth, canvasHeight, getPt);
      }

      const getPt3D = (idx: number) => ({
        x: landmarks[idx].x,
        y: landmarks[idx].y,
        z: landmarks[idx].z || 0
      });

      const dist3D = (p1: any, p2: any) => Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
      );

      const wrist3D = getPt3D(0);
      const thumbTip3D = getPt3D(4);
      const indexPip3D = getPt3D(6);
      const indexTip3D = getPt3D(8);
      const middlePip3D = getPt3D(10);
      const middleTip3D = getPt3D(12);
      const ringPip3D = getPt3D(14);
      const ringTip3D = getPt3D(16);
      const pinkyPip3D = getPt3D(18);
      const pinkyTip3D = getPt3D(20);

      const fingerExtended = (tip: any, pip: any) => dist3D(tip, wrist3D) > dist3D(pip, wrist3D);

      const indexUp = fingerExtended(indexTip3D, indexPip3D);
      const middleUp = fingerExtended(middleTip3D, middlePip3D);
      const ringUp = fingerExtended(ringTip3D, ringPip3D);
      const pinkyUp = fingerExtended(pinkyTip3D, pinkyPip3D);

      // Pinch distances in 2D for scaling calculations on standard screen coordinates
      const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
      const middleThumbDist = Math.hypot(landmarks[4].x - landmarks[12].x, landmarks[4].y - landmarks[12].y);

      // Robust 3D checks for pinch gesture state
      const isPinching = dist3D(thumbTip3D, indexTip3D) < 0.065;
      const isMiddlePinching = dist3D(thumbTip3D, middleTip3D) < 0.065;

      onHandUpdateRef.current({
        indexTip: getPt(8),
        thumbTip: getPt(4),
        middleTip: getPt(12),
        pinchDist,
        middleThumbDist,
        indexUp,
        middleUp,
        ringUp,
        pinkyUp,
        isPinching,
        isMiddlePinching
      });
    };

    try {
      const hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.6
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      const camera = new window.Camera(videoElement, {
        onFrame: async () => {
          if (handsRef.current) {
            try {
              await handsRef.current.send({ image: videoElement });
            } catch (e) {
              console.warn("MediaPipe send error:", e);
            }
          }
        },
        width: 1280,
        height: 720
      });

      camera.start().then(() => {
        setIsReady(true);
      }).catch((err: any) => {
        console.error("Camera error:", err);
        setError("Camera access needed");
      });
      cameraRef.current = camera;

    } catch (err) {
      console.error("Error initializing MediaPipe:", err);
      setError("Failed to initialize tracking");
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {
          console.warn("MediaPipe close error:", e);
        }
        handsRef.current = null;
      }
    };
  }, [videoRef, skeletonCanvasRef]); // Intentionally omitting settings to avoid re-init

  return { error, isReady };
}
