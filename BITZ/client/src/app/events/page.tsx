'use client';

import React from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f6f9ec] flex flex-col">
      {/* Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('/background/home.svg')`,
          backgroundColor: '#f6f9ec',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Header */}
      <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" />
      
      {/* Main Content - flex-grow ensures it takes available space */}
      <main className="flex-grow max-w-3xl mx-auto px-6 py-8 w-full">
      
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}