'use client';

import React, { useState, useEffect } from 'react';
import Footer from '@/app/Footer';
import Header from '@/app/Header';
import Home from '@/app/Home';

export default function Page() {
  const [isMovingUp, setIsMovingUp] = useState<boolean>(false);
  const [splashText, setSplashText] = useState<string>('');
  
  useEffect(() => {
    // Extract first subdomain from hostname
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // If there's a subdomain (more than 2 parts, or more than 1 for localhost)
    if (parts.length > 2 || (parts.length === 2 && !parts[1].includes('localhost'))) {
      setSplashText(parts[0]);
    }
  }, []);
  
  const handleClick = (): void => {
    setIsMovingUp(true);
    setTimeout(() => {
      console.log("Navigated to next page");
    }, 600);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Landing Page - on top */}
      <div 
        className={`absolute inset-0 z-10 transition-transform duration-700 ${
          isMovingUp ? '-translate-x-full pointer-events-none' : ''
        }`}
        onClick={handleClick}
        style={{
          backgroundImage: `url('/background/landing.jpg')`,
          backgroundSize: 'cover',
          backgroundColor: '#f6f9ec',
          backgroundPosition: 'center'
        }}
      >
        {/* Minecraft-style splash text - top right corner */}
        {splashText && (
          <div 
            className="absolute top-4 right-4 pointer-events-none origin-top-right"
            style={{
              transform: 'rotate(-15deg)',
            }}
          >
            <span 
              className="text-yellow-300 font-bold text-2xl md:text-3xl"
              style={{
                textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                fontFamily: 'sans-serif',
                animation: 'splash-bounce 1s ease-in-out infinite',
              }}
            >
              {splashText}!
            </span>
          </div>
        )}
        
        {/* BITZ Logo Text version */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <img 
            src="logo/bitz_bicolor.svg" 
            alt="BITZ Logo"
            className="w-64 h-auto"
          />

          <div className="mt-6">
            <img 
              src="/icons/arrows_bicolor.svg" 
              alt="Menu Arrows"
              className="w-24 h-auto" 
            />
          </div>
        </div>
      </div>
      
      {/* Main Content - changed to flexible layout */}
      <div className="absolute inset-0 flex flex-col"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#f6f9ec',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" />
        
        {/* Make Home component grow to fill available space */}
        <div className="flex-grow mt-20">
          <Home />
        </div>
        
        <Footer />
      </div>
      
      {/* Minecraft splash animation */}
      <style jsx>{`
        @keyframes splash-bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}