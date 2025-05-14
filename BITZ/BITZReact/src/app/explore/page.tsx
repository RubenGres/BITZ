'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import QuestExplorer from './QuestExplorer';
import { API_URL } from '@/app/Constants';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ExplorePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const questId = searchParams.get('id');

  if (!questId) {
    // If no ID is provided, redirect to the list page
    window.location.href = '/list';
    return null;
  }

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
      
      {/* Main content */}
      <div className="flex-grow container mx-auto px-4 py-6">
        <QuestExplorer questId={questId} />
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}