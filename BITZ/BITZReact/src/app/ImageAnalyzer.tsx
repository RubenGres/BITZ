'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { API_URL } from './Constants';

const ImageAnalyzer: React.FC = () => {
  // State
  const [activeScreen, setActiveScreen] = useState<'initial' | 'analysis' | 'loading'>('initial');
  const [imageData, setImageData] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Component rendered');
  const [userLocation, setUserLocation] = useState<{
    name: string;
    coordinates: { latitude: number; longitude: number } | null;
  }>({
    name: "unknown",
    coordinates: null
  });
  
  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Get conversation ID from localStorage or create a new one
  const conversationId = localStorage.getItem('conversation_id') || `${Date.now()}${Math.floor(performance.now())}`;
  
  // Save conversation ID to localStorage
  useEffect(() => {
    localStorage.setItem('conversation_id', conversationId);
  }, [conversationId]);

  // Get user's location on component mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        setDebugInfo(prev => prev + "\nAttempting to get user location");
        
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            
            setDebugInfo(prev => prev + "\nReceived coordinates");
            
            // Update state with coordinates
            setUserLocation(prev => ({
              ...prev,
              coordinates
            }));
            
            // Try to get location name
            try {
              await fetchLocationName(coordinates.latitude, coordinates.longitude);
            } catch (error) {
              setDebugInfo(prev => prev + `\nError fetching location name: ${error instanceof Error ? error.message : String(error)}`);
            }
          },
          (error) => {
            setDebugInfo(prev => prev + `\nGeolocation error: ${error.message}`);
          }
        );
      } catch (error) {
        setDebugInfo(prev => prev + `\nLocation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    getLocation();
  }, []);

  // Fetch location name from coordinates
  const fetchLocationName = async (latitude: number, longitude: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url);
      
      setDebugInfo(prev => prev + "\nFetching location name");
      
      if (response.ok) {
        const data = await response.json();
        const locationName = data.display_name || "Location not found";
        
        setDebugInfo(prev => prev + `\nLocation name: ${locationName}`);
        
        // Update state with location name
        setUserLocation(prev => ({
          ...prev,
          name: locationName
        }));
      } else {
        setDebugInfo(prev => prev + `\nLocation API error: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      setDebugInfo(prev => prev + `\nError fetching location name: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  // Component mount effect
  useEffect(() => {
    try {
      console.log("Component mounted");
      setDebugInfo(prev => prev + "\nComponent mounted");
      
      // For debugging API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://oaak.rubengr.es";
      console.log("API URL:", apiUrl);
      setDebugInfo(prev => prev + `\nAPI URL: ${apiUrl}`);
    } catch (error) {
      console.error("Error in useEffect:", error);
      setDebugInfo(prev => prev + `\nError: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    try {
      const file = event.target.files?.[0];
      if (!file) {
        setDebugInfo(prev => prev + "\nNo file selected");
        return;
      }

      // Set loading state
      setActiveScreen('loading');
      setDebugInfo(prev => prev + "\nFile selected, processing...");

      // Use FileReader to read the file
      const base64Data = await readFileAsBase64(file);
      setDebugInfo(prev => prev + "\nFile loaded as base64");
      
      // Update image data state
      setImageData(base64Data);
      
      // Send the data to the API
      try {
        setDebugInfo(prev => prev + "\nSending data to API");
        
        const requestBody = {
          image_data: base64Data, // Use the local variable, not the state
          conversation_id: conversationId,
          user_location: userLocation.name,
          image_location: userLocation.coordinates
        };
        
        const response = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
          const responseData = await response.json();
          setDebugInfo(prev => prev + "\nAPI response received successfully");
          // Handle response data here if needed
        } else {
          setDebugInfo(prev => prev + `\nAPI error: ${response.status}`);
        }
      } catch (error) {
        console.error("API request error:", error);
        setDebugInfo(prev => prev + `\nAPI request error: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Set screen to analysis
      setActiveScreen('analysis');
      
    } catch (error) {
      console.error("Error in handleFileUpload:", error);
      setDebugInfo(prev => prev + `\nError in handleFileUpload: ${error instanceof Error ? error.message : String(error)}`);
      // Reset to initial screen on error
      setActiveScreen('initial');
    }
  };

  // Helper function to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (e) => {
        reject(new Error("FileReader error"));
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Handler for camera button
  const handleCameraButton = (): void => {
    cameraInputRef.current?.click();
    setDebugInfo(prev => prev + "\nCamera button clicked");
  };

  // Minimal styles for debugging
  const styles = {
    app: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    screen: { width: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
    promptContainer: { textAlign: 'center' as const, maxWidth: '600px' },
    buttonContainer: { marginTop: '20px', display: 'flex', gap: '10px' },
    primaryButton: { 
      padding: '10px 20px', 
      background: '#4CAF50', 
      color: 'white', 
      border: 'none', 
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    secondaryButton: { 
      padding: '10px 20px', 
      background: '#2196F3', 
      color: 'white', 
      border: 'none', 
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    debugSection: {
      marginTop: '20px',
      padding: '10px',
      background: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '4px',
      whiteSpace: 'pre-wrap' as const,
      fontFamily: 'monospace',
      fontSize: '12px'
    }
  };

  return (
    <div style={styles.app}>
      <h1>Image Analyzer Debug</h1>
      
      {/* Initial Screen */}
      {activeScreen === 'initial' && (
        <div style={styles.screen}>
          <div style={styles.promptContainer}>
            <h2>Explore with AI Vision</h2>
            <p>Take a photo or upload an image to start the conversation</p>
            <div style={styles.buttonContainer}>
              {/* Camera input using capture attribute */}
              <input 
                type="file" 
                ref={cameraInputRef}
                accept="image/*" 
                capture="environment" 
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button onClick={handleCameraButton} style={styles.primaryButton}>
                <Camera size={24} />
                Take Photo
              </button>
              
              {/* Regular file upload option */}
              <label htmlFor="file-upload" style={styles.secondaryButton}>
                <Upload size={24} />
                Upload Image
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {activeScreen === 'loading' && (
        <div style={styles.screen}>
          <h2>Processing...</h2>
          <p>Please wait while we analyze your image</p>
        </div>
      )}

      {/* Analysis Screen - Simple version */}
      {activeScreen === 'analysis' && imageData && (
        <div style={styles.screen}>
          <h2>Image Analysis</h2>
          <img 
            src={`data:image/jpeg;base64,${imageData}`} 
            alt="Captured image" 
            style={{ maxWidth: '100%', maxHeight: '300px' }}
          />
          <button 
            onClick={() => setActiveScreen('initial')}
            style={{ ...styles.primaryButton, marginTop: '20px' }}
          >
            Back
          </button>
        </div>
      )}

      {/* Debug Information */}
      <div style={styles.debugSection}>
        <strong>Debug Info:</strong>
        {debugInfo}
      </div>
    </div>
  );
};

export default ImageAnalyzer;