'use client';

import React, { useState } from 'react';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import Link from 'next/link';
import FullscreenImageModal from "@/app/components/FullscreenImageModal";

export default function ProjectPage() {
  const [fullscreenImage, setFullscreenImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const openFullscreen = (src: string, alt: string) => {
    setFullscreenImage({ src, alt });
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };
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
        <h1 className="text-3xl mb-8">Eyes on the Field</h1>
        
        {/* PROJECT DESCRIPTION Section */}
        <section className="mb-4">
          <p className="mb-8">
            <span className="text-green-600 font-semibold">EYES ON THE FIELD </span> (<a href="http://venncanteen.com/">Venn</a>) was a farm visit and dinner event that used the BITZ tool to explored the agricultural biodiversity of the Porto region, using all of the senses.
          <a
            href="https://venn.bitz.tools/explore"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0070f3", textDecoration: "underline", margin: "1em 0", display: "inline-block" }}
          >
            Explore the data
          </a>
          </p>
          
          <div className="mb-8">
            <img 
              src="/events/venn/venn-x-bitz_ig_post.jpg" 
              alt="Eyes on the Field (Venn) x BITZ Event Poster" 
              className="w-full max-w-md mx-auto  shadow-md"
            />
          </div>
        </section>

        {/* WORKSHOP Section */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-l font-medium mb-4">WORKSHOP</h2>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 w-max">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div 
                  key={num} 
                  className="flex-shrink-0 w-48 h-48 overflow-hidden  shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => openFullscreen(`/events/venn/workshop/workshop_${num}.jpg`, "")}
                >
                  <img 
                    src={`/events/venn/workshop/workshop_${num}.jpg`}
                    alt={""}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DINNER Section */}
        <section className="mb-8">
          <h2 className="text-orange-500 text-l font-medium mb-4">DINNER</h2>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 w-max">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div 
                  key={num} 
                  className="flex-shrink-0 w-48 h-48 overflow-hidden  shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => openFullscreen(`/events/venn/dinner/dinner_${num}.jpg`, "")}
                >
                  <img 
                    src={`/events/venn/dinner/dinner_${num}.jpg`}
                    alt={""}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <FullscreenImageModal
          src={fullscreenImage.src}
          alt={fullscreenImage.alt}
          questId=""
          isOpen={true}
          onClose={closeFullscreen}
        />
      )}
    </div>
  );
}