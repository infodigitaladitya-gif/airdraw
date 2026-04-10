import React from 'react';

interface HowToUseModalProps {
  onClose: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px', padding: '30px' }}>
        <h2>How to Use Air-Draw</h2>
        <div className="instruction-list" style={{ gap: '12px' }}>
          <div className="instruction-item">
            <div className="icon-circle">✏️</div>
            <span><strong>Draw:</strong> Raise only your Index Finger</span>
          </div>
          <div className="instruction-item">
            <div className="icon-circle">🤏</div>
            <span><strong>Select & Move:</strong> Pinch near a drawing, then move your hand</span>
          </div>
          <div className="instruction-item">
            <div className="icon-circle">🤟</div>
            <span><strong>Undo:</strong> Rock Sign (Index & Pinky up)</span>
          </div>
          <div className="instruction-item">
            <div className="icon-circle">✌️</div>
            <span><strong>Pause / Lift Pen:</strong> Peace Sign (Index & Middle up)</span>
          </div>
          <div className="instruction-item">
            <div className="icon-circle">👊</div>
            <span><strong>Freeze:</strong> Fist (no fingers up)</span>
          </div>
          <div className="instruction-item">
            <div className="icon-circle">👆</div>
            <span><strong>Click Buttons:</strong> Pinch over buttons</span>
          </div>
        </div>
        <button className="pill-btn" onClick={onClose} style={{ justifyContent: 'center', marginTop: '10px' }}>
          Got it!
        </button>
      </div>
    </div>
  );
};
