'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/app/Header';
import { getConversationId } from '../User';

export function MainScreen() {
  const [flavor, setFlavor] = useState<string | null>(null);
  const [conversationPrefix, setConversationPrefix] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const flavorParam = urlParams.get('flavor');
      setFlavor(flavorParam);
      
      // Get conversation ID prefix
      const conversationId = getConversationId();
      if (conversationId) {
        const prefix = conversationId.split('-')[0];
        setConversationPrefix(prefix);
      }
    }
  }, []);

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

      <div className="text-white text-center mb-4">
        <p className="text-lg mb-1">Quest Flavor: {flavor || 'default'}</p>
        <p className="text-lg">Conversation ID: {conversationPrefix || 'N/A'}</p>
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