'use client';

import React, { useState } from 'react';
import Footer from '@/app/Footer';
import Header from '@/app/Header';
import Home from '@/app/Home';

export default function Page() {
  const [isMovingUp, setIsMovingUp] = useState<boolean>(false);
  
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
          isMovingUp ? '-translate-x-full' : ''
        }`}
        onClick={handleClick}
        style={{
          backgroundImage: `url('/background/landing.jpg')`,
          backgroundSize: 'cover',
          backgroundColor: '#f6f9ec',
          backgroundPosition: 'center'
        }}
      >
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
      
      {/* Main Content */}
      <div className="absolute inset-0 bg-gray-100"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#f6f9ec',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" />
        
        <Home />
        
        <Footer />
      </div>
    </div>
  );
}