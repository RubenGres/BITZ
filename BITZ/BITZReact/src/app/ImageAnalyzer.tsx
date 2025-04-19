'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
// Let's create an inline style object instead of relying on the CSS module initially
// This will help us determine if the CSS module is the issue

const ImageAnalyzer: React.FC = () => {
  // State
  const [activeScreen, setActiveScreen] = useState<'initial' | 'analysis' | 'loading'>('initial');
  const [imageData, setImageData] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Component rendered');
  
  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Add error boundary
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

  // Handle file upload (simplified)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          setDebugInfo(prev => prev + "\nFile loaded");
          const base64Data = result.split(',')[1];
          setImageData(base64Data);
          setActiveScreen('analysis');
        } catch (error) {
          console.error("Error processing file:", error);
          setDebugInfo(prev => prev + `\nError processing file: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      reader.onerror = (e) => {
        setDebugInfo(prev => prev + `\nFileReader error: ${e}`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error in handleFileUpload:", error);
      setDebugInfo(prev => prev + `\nError in handleFileUpload: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handler for camera button
  const handleCameraButton = (): void => {
    cameraInputRef.current?.click();
    setDebugInfo(prev => prev + "\nCamera button clicked");
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
              
            </div>
          </div>
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
            style={styles.primaryButton}
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