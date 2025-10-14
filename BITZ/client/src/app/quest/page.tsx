'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { MainScreen } from './MainScreen';
import { InfoView } from './InfoView';
import { API_URL } from '../Constants';
import { getUserId, getConversationId, createNewConversationId} from '../User';
import { FaceAnonymizer } from './FaceAnonymizer';

export default function QuestPage() {  
  const [isLoading, setIsLoading] = useState(false);
  const [inQuestLoop, setInQuestLoop] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | undefined>(undefined);
  const [resultDict, setResultDict] = useState(null);
  const [flavor, setFlavor] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('');
  const [gpsCoordinates, setGpsCoordinates] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  const faceProcessorRef = useRef<FaceAnonymizer | null>(null);

  // Initialize MediaPipe when component mounts
  useEffect(() => {
    const initializeProcessor = async () => {
      try {
        faceProcessorRef.current = new FaceAnonymizer();
        await faceProcessorRef.current.initialize();
        console.log('Face anonymizer ready');
      } catch (error) {
        console.error('Failed to initialize face processor:', error);
      }
    };

    initializeProcessor();

    // Cleanup on unmount
    return () => {
      if (faceProcessorRef.current) {
        faceProcessorRef.current.cleanup();
      }
    };
  }, []);

  // Extract flavor from URL query parameters when component mounts
  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const flavorParam = urlParams.get('flavor');
      console.log('Flavor extracted from URL:', flavorParam);
      setFlavor(flavorParam); // Will be null if not found
    }
  }, []);

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
  };

  const handleGPSCoordinatesChange = (newCoordinates: string) => {
    setGpsCoordinates(newCoordinates);
  };

  async function processImage(imageData: string, flavorValue: string | null) {
    try {
        // Prepare the request body with all needed parameters including flavor
        const requestBody = {
          conversation_id: getConversationId(),
          user_id: getUserId(),
          image_data: imageData,
          image_location: location,
          image_coordinates: gpsCoordinates,
          flavor: flavorValue
        };
        
        console.log('Request body flavor:', flavorValue);
        
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

  const handleFileUpload = async (event) => {
    setIsLoading(true);
    setProcessingStatus('Loading image...');
  
    // Extract flavor directly from URL to avoid any state timing issues
    const urlParams = new URLSearchParams(window.location.search);
    const currentFlavor = urlParams.get('flavor');
    console.log('Flavor from URL at upload time:', currentFlavor);
  
    const file = event.target.files?.[0];
  
    console.log('File:', file);
  
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result;
  
        if (imageData === null) {
          console.error('Error: imageData is null');
          setIsLoading(false);
          setProcessingStatus('');
          return;
        }
  
        if (typeof imageData === 'string') {
          try {
            // Apply face anonymizer if processor is available
            let processedImageData = imageData;
            
            if (faceProcessorRef.current) {
              setProcessingStatus('Detecting and pixelating faces...');
              try {
                processedImageData = await faceProcessorRef.current.processImageWithFacePixelation(imageData);
                console.log('Face pixelation completed');
              } catch (pixelationError) {
                console.warn('Face pixelation failed, using original image:', pixelationError);
                // Continue with original image if face pixelation fails
              }
            }

            const base64Data = processedImageData.split(',')[1];
            setUploadedFile(processedImageData); // Use processed image for display
            
            console.log('Starting image processing...');
            console.log('User Location:', location, gpsCoordinates);
            
            setProcessingStatus('Analyzing image...');

            const result = await processImage(base64Data, currentFlavor);
            console.log('Result:', result);
            setResultDict(result);
            setIsLoading(false);
            setProcessingStatus('');
            setInQuestLoop(true);
            
          } catch (error) {
            console.error('Error in image processing pipeline:', error);
            setIsLoading(false);
            setProcessingStatus('');
            alert('Error processing image. Please try again.');
          }
        } else {
          console.error('Error: imageData is not a string');
          setIsLoading(false);
          setProcessingStatus('');
        }
      };
  
      reader.readAsDataURL(file);
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        setIsLoading(false);
        setProcessingStatus('');
      };
    } else {
      setIsLoading(false);
      setProcessingStatus('');
    }
  };

  const handleEndQuest = () => {
    // stop this conversation
    let conversation_graph_url = '/view?id=' + getConversationId();
    createNewConversationId();
    window.location.href = conversation_graph_url;
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
          <LoadingScreen processingStatus={processingStatus} />
        ) : inQuestLoop ? (
          <InfoView
            uploadedImage={uploadedFile}
            resultDict={resultDict}
            onEndQuest={handleEndQuest}
            onGPSCoordinatesChange={handleGPSCoordinatesChange}
          />
        ) : (
          <MainScreen 
            onLocationChange={handleLocationChange}
            onGPSCoordinatesChange={handleGPSCoordinatesChange}
          />
        )}
      </div>
    </div>
  );
}