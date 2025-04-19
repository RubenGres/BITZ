'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import SideMenu from '@/app/SideMenu';
import Footer from '@/app/Footer';
import Link from 'next/link';

export default function Home() {
  const [isMovingUp, setIsMovingUp] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  
  const handleClick = (): void => {
    setIsMovingUp(true);
    setTimeout(() => {
      console.log("Navigated to next page");
    }, 600);
  };

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
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
        {/* Header with Logo and Menu */}
        <header className="flex justify-between items-center p-4">
          <img 
            src="/logo/bitz_green.svg" 
            alt="Bitz Logo green"
            className="w-16 h-auto" 
          />
          <button 
            onClick={toggleMenu} 
            className="text-green-500 p-2 rounded-full hover:bg-[#3ec488]-50"
          >
            <Menu size={45} />
          </button>
        </header>
        
        {/* Side Menu Component */}
        <SideMenu isOpen={isMenuOpen} onClose={toggleMenu} />
        
        {/* Main Content */}
        <main className="flex flex-col items-center justify-center h-3/4">
          <div className="text-left mb-32 p-6">
            <p className="text-gray-600 text-2xl">Use BITZ to take photos of species and learn about the biodiversity around you.</p>
            <div className="mt-4">
            <button className="text-orange-500 font-medium">
              LEARN MORE {">>>"}
            </button>
          </div>
          </div>
          
          <Link href="/quest" className="w-full">
            <div className="bg-[#3ec488] text-white p-6 w-full text-center">
              <img src="text/start_quest.svg" alt="Start quest" className="w-[200px] h-auto mb-8 mx-auto" />
              <div className="flex justify-center">
                <img src="/icons/arrows_bicolor.svg" alt="Start Arrows" className="w-12 h-auto" />
              </div>
            </div>
          </Link>
          
        </main>
        
        {/* Footer Component */}
        <Footer />
      </div>
    </div>
  );
}