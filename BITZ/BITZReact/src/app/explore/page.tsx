'use client';

import React from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import QuestExplorer from './QuestExplorer';

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
      
      <QuestExplorer />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
