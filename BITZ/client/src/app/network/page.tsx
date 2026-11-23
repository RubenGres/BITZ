'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import NetworkTab from '../components/visuals/NetworkTab';
import { useExplorerData } from '../utils/useExplorerData';

export default function NetworkPage() {
  const { questDataDict, loading, error } = useExplorerData(true);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f9ec]">
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
      {/* <Header menuColor="text-green-500" logoSrc="/logo/bitz_green.svg" /> */}
     
      {/* Main Content - flex-grow  ensures it takes available space */}
      <main className="flex-grow  flex w-full bg-black">
        <div className="flex flex-col w-full mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}
         
          {loading ? (
            <div className="flex justify-center items-center h-64 bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="flex-grow  flex w-full h-full">
              <NetworkTab
                questDataDict={questDataDict}
                loading={loading}
                error={error}
              />
            </div>
          )}
        </div>
      </main>
     
    </div>
  );
}