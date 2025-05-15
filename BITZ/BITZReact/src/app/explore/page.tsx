'use client';

import React, { Suspense } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import QuestExplorer from './QuestExplorer';
import { useRouter, useSearchParams } from 'next/navigation';

// Client component that uses search params
function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const questId = searchParams.get('id');

  // Use React's useEffect for navigation instead of directly modifying window.location
  React.useEffect(() => {
    if (!questId) {
      router.push('/list');
    }
  }, [questId, router]);

  // Return null during the redirect check
  if (!questId) {
    return null;
  }

  return (
    <div className="flex-grow container mx-auto px-4 py-6">
      <QuestExplorer questId={questId} />
    </div>
  );
}

// Main page component
export default function ExplorePage() {
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
      
      {/* Main content with Suspense boundary */}
      <Suspense fallback={<div className="flex-grow container mx-auto px-4 py-6">Loading...</div>}>
        <ExploreContent />
      </Suspense>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}