import React from 'react';

export const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-logo">Air-Draw</div>
      <div className="loading-author">by ADITYA Zen</div>
      <div className="loading-bar-container">
        <div className="loading-text">INITIALIZING HAND TRACKING...</div>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
};
