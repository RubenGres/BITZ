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
          <h2 className="text-orange-500 text-l font-medium mb-4">THE TOOL</h2>
          <p className="mb-4">
            <span className="text-green-600 font-semibold">BITZ (Biodiversity in Transition Zones)</span> is a digital tool for identifying and learning about the organisms that live near you.
          </p>
          <p className="mb-4">
            BITZ focuses on the sites & transition zones that sit between urban informatics and biodiversity informatics: <span className="text-green-600 font-semibold">gardens, farms, suburbs and the side of the highway</span>.
          </p>
          <p className="mb-8">
            BITZ is a biodiversity storytelling and data-gathering tool for organisations, governments and activists that helps them run community-driven biodiversity-listing events that is better than automated techno-centric solutions because it brings people to the field, starts conversations and generates public datasets.
          </p>
        </section>
        
        {/* THE CREATORS Section */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-l font-medium mb-4">THE CREATORS</h2>
          <p className="mb-8">
            BITZ was created by <span className="text-green-600 font-semibold">NiceTrails & Genomic Gastronomy</span> in 2025 with support from <span className="text-green-600 font-semibold">MUSAE, an EU S+T+ARTS program</span>.
          </p>

          <img src="logo/starts_eu.png" alt="STARTS EU Logo" />
        </section>
        
        {/* THE DATA Section */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-l font-medium mb-4">THE DATA</h2>
          <p className="mb-8">
            BITZ collects and coalesces data... outputting it as X DarwinCore....
          </p>
        </section>

        {/* WANT TO USE BITZ Section */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-l font-medium mb-4">WANT TO USE BITZ IN YOUR PROJECT?</h2>
          <p className="mb-4">
            We work with organizations to create customized BITZ experiences that fit your needs.
          </p>

          <p>
            We charge a setup/customization fee for bespoke projects, but the base tool is free.
          </p>

          <br></br>

          <p>Contact us: <a href="mailto:info@bitz.tools" className="text-green-600 font-semibold underline hover:text-green-800">info@bitz.tools</a></p>
        </section>

        {/* PREVIOUS PROJECTS Section */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-l font-medium mb-4">OUR PREVIOUS PROJECTS INCLUDE:</h2>
          <p className="mb-4">
            We work with organizations to create customized BITZ experiences that fit your needs.
          </p>
        </section>

        {/* TOS Section */}
        <section className="mb-16">
          <h2 className="text-orange-500 text-l font-medium mb-4">TERMS OF SERVICE</h2>
          <p className="mb-8">
            Full terms of service can be found <Link href="/terms" className="text-blue-600 underline hover:text-blue-800">here</Link>.
          </p>
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}