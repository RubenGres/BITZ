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
      <h1 className="text-3xl mb-12">About</h1>
        
        {/* THE TOOL Section */}
        <section className="mb-8">
          <h2 className="text-orange-500  text-l font-medium mb-4">THE TOOL</h2>
          <p className="mb-4">
            BITZ (Biodiversity in Transition Zones) is a digital tool for identifying and learning about the organisms that live near you.
          </p>
          <p className="mb-4">
            BITZ focuses on the sites & transition zones that sit between urban informatics and biodiversity informatics: gardens, farms, suburbs and the side of the highway.
          </p>
          <p className="mb-8">
            BITZ is a biodiversity storytelling and data-gathering tool for organisations, governments and activists that helps them run community-driven biodiversity-listing events that is better than automated techno-centric solutions because it brings people to the field, starts conversations and generates public datasets.
          </p>
          <p>
            We charge a setup/customization fee for bespoke projects, but the base tool is free.
          </p>
        </section>
        
        {/* THE CREATORS Section */}
        <section className="mb-8">
          <h2 className="text-orange-500  text-l font-medium mb-4">THE CREATORS</h2>
          <p className="mb-8">
            BITZ was created by Nicetails & Genomic Gastronomy in 2025 with support from MUSAE, an EU S+T+ARTS program.
          </p>

          <img src="logo/starts_eu.png"></img>
        </section>
        
        {/* THE DATA Section */}
        <section className="mb-16">
          <h2 className="text-orange-500  text-l font-medium mb-4">THE DATA</h2>
          <p className="mb-8">
            BITZ collects and coalesces data... outputting it as X DarwinCore....
          </p>
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}