'use client';

import React, { useState, useRef, useEffect } from 'react';
import Header from './Header';
import ChatView from './ChatView';

interface InfoViewProps {
  uploadedImage?: string;
  resultDict?: any;
  onEndQuest?: () => void;
  onGPSCoordinatesChange?: (coordinates: string) => void;
}

export const InfoView: React.FC<InfoViewProps> = ({ uploadedImage, resultDict, onEndQuest, onGPSCoordinatesChange }) => {
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleAnswer = (answer: string) => {
    if (answer === 'yes') {

      // set GPS coordinates if the user has allowed location access
      if (onGPSCoordinatesChange) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const coords = `${latitude}, ${longitude}`;
            onGPSCoordinatesChange(coords);
          },
          (error) => {
            console.error('Error getting GPS coordinates:', error);
            onGPSCoordinatesChange('N/A');
          });
      }

      const cameraInput = document.getElementById('camera-input');
      if (cameraInput) {
        cameraInput.click();
      }
    } else {
      setQuestionAnswered(true);
      // We'll use setTimeout to ensure the DOM has updated with the new element before scrolling
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Common shadow style for all div elements
  const whiteShadowStyle = {
    boxShadow: '8px 8px 0px 0px #ffffff',
  };

  const coralShadowStyle = {
    boxShadow: '8px 8px 0px 0px #ef5232',
  };

  const greenShadowStyle = {
    boxShadow: '8px 8px 0px 0px #59bd8a',
  };

  // Effect to scroll to the bottom when questionAnswered becomes true
  useEffect(() => {
    if (questionAnswered && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [questionAnswered]);

  return (
    <div className="relative w-full h-full overflow-y-auto">
      {/* Fixed Background Image - Lower z-index */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: uploadedImage ? `url(${uploadedImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          filter: 'brightness(0.8)'
        }}
      />

      {/* Fixed Header - Higher z-index and positioned at the top */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <Header logoSrc="/logo/bitz_white.svg" onEndQuest={onEndQuest} />
      </div>

      {/* Chat View Component */}
      <ChatView isOpen={isChatOpen} analysisReply={resultDict} onClose={() => setIsChatOpen(false)} />

      {/* Content - with padding to account for fixed header */}
      <div className="relative z-10 flex flex-col h-full pt-20 pb-20">
        {/* Species Identification */}
        <div className="bg-[#f6f9ec] bg-opacity-90 p-4 mb-10 mr-16" style={greenShadowStyle}>
          <div className="text-green-800 uppercase font-semibold">This is probably</div>
          <div className="text-red-500 font-medium">{resultDict?.species_identification?.name || 'Unknown Species'}</div>
          <div className="mt-2 text-gray-700">
            {resultDict?.species_identification?.what_is_it || 'No species information available.'}
          </div>
        </div>

        {/* Ecological Information */}
        <div className="bg-[#f6f9ec] bg-opacity-90 p-4 mb-10 mr-16" style={greenShadowStyle}>
          <div className="text-green-800 uppercase font-semibold">More info</div>
          <div className="mt-2 text-gray-700">
            <p>{resultDict?.species_identification?.information || 'No ecological information available.'}</p>
          </div>
        </div>

        {/* Ask Question Button */}
        <div className="bg-[#ef5232] p-4 mb-10 mr-16" style={whiteShadowStyle}>
          <button
            className="text-white flex items-center w-full"
            onClick={toggleChat}
          >
            <span className="mr-2">▶▶▶</span> ASK A QUESTION...
          </button>
        </div>

        {/* Next Target */}
        <div className="bg-[#f6f9ec] bg-opacity-90 p-4 mb-10 mr-16" style={coralShadowStyle}>
          <div className="text-[#ef5232] uppercase font-semibold">NEXT TARGET</div>
          <div className="mt-2">
            <p className="font-semibold">Look for: {resultDict?.next_target?.focus || 'Next interesting specimen'}</p>
            <p className="mt-1"> {resultDict?.next_target?.location || 'Around your current area'}</p>
          </div>
        </div>

        {/* Interactive Question */}
        <div className="bg-[#f6f9ec] p-4 mb-10 mr-16" style={coralShadowStyle}>
          <p className="text-green-800">{resultDict?.sampling_guidance?.question || 'Do you see anything interesting?'}</p>

          <div className="mt-2 flex flex-col gap-2 text-[#ef5232]">
            <button
              onClick={() => handleAnswer('yes')}
              className="border border-[#ef5232] p-2 rounded flex items-center justify-center"
            >
              YES <img src="/icons/camera.svg" alt="Camera" className="h-[18px] ml-2" />
            </button>

            <button
              onClick={() => handleAnswer('no')}
              className="bg-green-800 text-white p-2 rounded flex items-center justify-center"
            >
              NO <img src="/icons/thumb_down.svg" alt="Thumb down" className="h-[20px] ml-2" />
            </button>
          </div>
        </div>

        {/* Next Photo Instruction */}
        {questionAnswered && (
          <div className="bg-[#f6f9ec] p-4 mb-16 mr-16" style={coralShadowStyle} ref={bottomRef}>
            <p className="text-green-800">
              {resultDict?.sampling_guidance?.no_action || "That's okay: turn around and take a picture of the next interesting thing you see."}
            </p>

            <div className="flex justify-center"> {/* Centering container */}
              <button
                className="flex items-center justify-center bg-[#f6f9ec] text-[#f44928] border-2 border-[#f44928] py-4 px-8 mt-4 tracking-widest"
                onClick={() => handleAnswer('yes')}
              >
                <img src="/icons/camera.svg" alt="Camera" className="h-[18px] ml-2 mr-4" />
                take next photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
