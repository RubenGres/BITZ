'use client';

import React, { useState } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { MainScreen } from './MainScreen';
import { InfoView } from './InfoView';

export default function HomePage() {
  const API_URL = "https://scaling-space-carnival-qvvrrjxqgrp246pj-5000.app.github.dev"
  // const API_URL = "https://oaak.rubengr.es"
  const [isLoading, setIsLoading] = useState(false);
  const [inQuestLoop, setInQuestLoop] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | undefined>(undefined);
  const [resultDict, setResultDict] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{
    name: string;
    coordinates: { latitude: number; longitude: number } | null;
  }>({
    name: "unknown",
    coordinates: null
  });

  const conversation_id = `${Date.now()}${Math.floor(performance.now())}`;

  const fetchLocationName = async (latitude: number, longitude: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url);
            
      if (response.ok) {
        const data = await response.json();
        const locationName = data.display_name || "Location not found";
        
        // Update state with location name
        setUserLocation(prev => ({
          ...prev,
          name: locationName
        }));
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      throw error;
    }
  };

  async function processImage(imageData: string) {
    try {
        // Prepare the request body with all needed parameters
        const requestBody = {
            image_data: imageData,
            conversation_id: conversation_id,
            user_location: userLocation.name,
            image_location: userLocation.coordinates
        };
        
        const response = await fetch(API_URL + '/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        return response.json();
        
    } catch (err) {
        console.error('Error processing image:', err);
        alert('Error processing image. Please try again.');
    }
  }

  const handleFileUpload = (event) => {
    setIsLoading(true);
  
    const file = event.target.files?.[0];
  
    console.log('File:', file);
  
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result;
        console.log(imageData);
  
        if (imageData === null) {
          console.error('Error: imageData is null');
          setIsLoading(false);
          return;
        }
  
        if (typeof imageData === 'string') {
          const base64Data = imageData.split(',')[1];
          setUploadedFile(imageData);
          
          console.log('Starting image processing...');
          console.log('User Location:', userLocation);
  
          processImage(base64Data).then((result) => {
            console.log('Result:', result);
            setResultDict(result);
  
            setIsLoading(false);
            setInQuestLoop(true);
          });
        } else {
          console.error('Error: imageData is not a string');
          setIsLoading(false);
        }
      };
  
      // This line was missing - it actually starts the file reading process
      reader.readAsDataURL(file);
      
      // Add error handling for the FileReader
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        setIsLoading(false);
      };
    } else {
      // No file selected
      setIsLoading(false);
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
          <InfoView uploadedImage={uploadedFile} resultDict={resultDict} />
        ) : (
          <MainScreen/>
        )}
      </div>
    </div>
  );
}