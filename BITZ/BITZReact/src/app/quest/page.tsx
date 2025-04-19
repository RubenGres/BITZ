'use client';

import React, { useState } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { MainScreen } from './MainScreen';
import { InfoView } from './InfoView';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [inQuestLoop, setInQuestLoop] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | undefined>(undefined);

  const handleFileUpload = (event) => {
    setIsLoading(true);

    const file = event.target.files?.[0];
    if (file) {
      // Create a URL for the uploaded file
      const fileURL = URL.createObjectURL(file);
      setUploadedFile(fileURL);
      
      // Simulate analysis for 5 seconds then return to main screen
      setTimeout(() => {
        setIsLoading(false);
        setInQuestLoop(true);
      }, 1000);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#59bd8a',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >

        <input 
          type="file" 
          id="camera-input" 
          accept="image/*" 
          capture="environment" 
          style={{display: 'none'}} 
          onChange={handleFileUpload}
        />

        {isLoading ? (
          <LoadingScreen />
        ) : inQuestLoop ? (
          <InfoView uploadedImage={uploadedFile} />
        ) : (
          <MainScreen/>
        )}
      </div>
    </div>
  );
}