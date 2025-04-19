'use client';

// LoadingScreen.jsx
import React from 'react';

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-2/2 text-white text-center">
      <div className="mb-16">
        <p className="text-xl mb-16 tracking-widest">analyzing image...</p>
        
        {/* Loading spinner - white semi-circle */}
        <div className="w-24 h-24 border-8 border-white border-t-transparent rounded-full animate-spin mx-auto mb-16"></div>
        
        <p className="text-xl mt-16 tracking-widest">take this moment to<br />look around you.</p>
      </div>
    </div>
  );
}