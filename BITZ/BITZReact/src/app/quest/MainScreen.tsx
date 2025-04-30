'use client';

import React from 'react';
import Header from '@/app/Header';

export function MainScreen() {
  return (
    <>
    <Header menuColor="text-white" logoSrc="/logo/bitz_white.svg" />

    <main className="flex flex-col items-center justify-center h-4/5">
      <div className="text-white text-center">
        <img 
          src="/text/explore.svg" 
          alt="EXPLORE"
          className="w-[300px] h-auto mb-4 mx-auto"
          />
        <p className="text-white text-xl mb-8">BIODIVERSITY WITH BITZ</p>
      </div>

      <div className="relative">
        <button 
          className="flex items-center justify-center bg-white text-[#f44928] border-2 border-[#f44928] py-4 px-[90px]"
          onClick={() => {
              const cameraInput = document.getElementById('camera-input');
              if (cameraInput) {
                  cameraInput.click();
                }
            }}
            >
          <img src="/icons/camera.svg" alt="Camera" className="w-6 h-6 mr-3" />
          <span className="text-xl tracking-widest">take photo</span>
        </button>
      </div>
    </main>
    </>
  );
}