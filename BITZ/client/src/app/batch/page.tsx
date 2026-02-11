'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/app/Header';
import { LoadingScreen } from './LoadingScreen';
import { API_URL, FARM_LOCATIONS } from '../Constants';
import { getUserId, getConversationId, createNewConversationId } from '../User';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  processedData?: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: any;
}

export const getDomainKey = (): string => {
  // Check for window existence to ensure this only runs client-side
  if (typeof window === 'undefined') return "";
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || !isNaN(Number(hostname.replace(/\./g, '')))) {
    return "";
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0]
  }

  return "";
};

const domain_key = getDomainKey()
const MOCK_LOCATIONS = FARM_LOCATIONS[domain_key as keyof typeof FARM_LOCATIONS]

export default function BatchUploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [origin, setOrigin] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [currentQuestId, setCurrentQuestId] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);

  // Initialize quest ID
  useEffect(() => {
    setCurrentQuestId(createNewConversationId());
  }, []);

  const getRandomLocation = () => {
    const randomIndex = Math.floor(Math.random() * MOCK_LOCATIONS.length);
    return MOCK_LOCATIONS[randomIndex];
  };

  async function processImage(imageData: string, location: string, coordinates: string) {
    try {
      const requestBody = {
        conversation_id: currentQuestId,
        user_id: getUserId(),
        image_data: imageData,
        image_location: location,
        image_coordinates: coordinates,
        flavor: 'basic'
      };

      const response = await fetch(API_URL + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      return response.json();
    } catch (err) {
      console.error('Error processing image:', err);
      throw err;
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handleProcessAll = async () => {
    if (uploadedImages.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    if (!origin) {
      alert('Please select an origin');
      return;
    }

    setIsLoading(true);
    setProcessedCount(0);

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];

      try {
        setProcessingStatus(`Processing image ${i + 1} of ${uploadedImages.length}...`);

        // Update status to processing
        setUploadedImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, status: 'processing' as const } : img
        ));

        // Read file as data URL
        const imageData = await readFileAsDataURL(image.file);
        const base64Data = imageData.split(',')[1];

        // Get random location
        const location = getRandomLocation();

        setProcessingStatus(`Analyzing image ${i + 1}...`);
        const result = await processImage(base64Data, location.name, location.coordinates);

        // Update with result
        setUploadedImages(prev => prev.map(img =>
          img.id === image.id ? {
            ...img,
            status: 'complete' as const,
            processedData: imageData,
            result
          } : img
        ));

        setProcessedCount(prev => prev + 1);

      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);

        // Update status to error
        setUploadedImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, status: 'error' as const } : img
        ));
      }
    }

    setIsLoading(false);
    setProcessingStatus('');
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleViewResults = () => {
    const conversationGraphUrl = '/view?id=' + currentQuestId;
    window.location.href = conversationGraphUrl;
  };

  const handleNewBatch = () => {
    setUploadedImages([]);
    setOrigin('');
    setProcessedCount(0);
    createNewConversationId();
    setCurrentQuestId(getConversationId());
  };

  const allProcessed = uploadedImages.length > 0 &&
    uploadedImages.every(img => img.status === 'complete' || img.status === 'error');

  return (
    <>
      <div className="min-h-screen"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#59bd8a',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat'
        }}
      >
        <Header menuColor="text-white" logoSrc="/logo/bitz_white.svg" />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-3xl font-bold text-white mb-6 text-center drop-shadow-lg">Batch Upload</h1>

          {/* Processing Status Banner */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-500 bg-opacity-90 rounded-lg shadow-lg animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <p className="text-white font-semibold">{processingStatus}</p>
              </div>
            </div>
          )}

          {/* Origin Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-white mb-2 drop-shadow-md">
              Origin
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-4 py-3 border-2 border-white bg-white bg-opacity-90 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent text-gray-800 font-medium shadow-lg"
              disabled={isLoading}
            >
              <option value="">Select origin...</option>
              {MOCK_LOCATIONS.map((location) => (
                <option key={location.name} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-white mb-2 drop-shadow-md">
              Upload Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="w-full px-4 py-3 border-2 border-white bg-white bg-opacity-90 rounded-lg cursor-pointer focus:ring-2 focus:ring-white focus:border-transparent text-gray-800 font-medium shadow-lg"
              disabled={isLoading}
            />
          </div>

          {/* Image Grid */}
          {uploadedImages.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
                Uploaded Images ({uploadedImages.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.processedData || image.preview}
                      alt="Upload preview"
                      className="w-full h-48 object-cover rounded-lg shadow-lg border-2 border-white border-opacity-50"
                    />

                    {/* Status Badge */}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${image.status === 'pending' ? 'bg-gray-500 text-white' :
                      image.status === 'processing' ? 'bg-blue-500 text-white animate-pulse' :
                        image.status === 'complete' ? 'bg-green-500 text-white' :
                          'bg-red-500 text-white'
                      }`}>
                      {image.status}
                    </div>

                    {/* Remove Button */}
                    {image.status === 'pending' && !isLoading && (
                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {processedCount > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm font-semibold text-white mb-2 drop-shadow-md">
                <span>Progress</span>
                <span>{processedCount} / {uploadedImages.length}</span>
              </div>
              <div className="w-full bg-white bg-opacity-30 rounded-full h-3 shadow-lg">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-300 shadow-md"
                  style={{ width: `${(processedCount / uploadedImages.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleProcessAll}
              disabled={uploadedImages.length === 0 || !origin || isLoading}
              className="flex-1 bg-white text-green-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-white disabled:bg-opacity-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isLoading ? 'Processing...' : 'Process All Images'}
            </button>

            {allProcessed && (
              <>
                <button
                  onClick={handleViewResults}
                  className="flex-1 bg-white text-blue-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-all shadow-lg"
                >
                  View Results
                </button>
                <button
                  onClick={handleNewBatch}
                  className="flex-1 bg-white text-gray-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-all shadow-lg"
                >
                  New Batch
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}