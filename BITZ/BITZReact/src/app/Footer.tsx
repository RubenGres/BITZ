'use client';

import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 w-full bg-[#68623d] p-4 text-xs text-[#3ec488]">
      <div className="flex justify-between items-center">
        <img 
          src="/logo/bitz_green.svg" 
          alt="Menu Arrows"
          className="w-6 h-auto" 
        />
        <div>© 2025 Nicetrails + Genomic Gastronomy</div>
        <div>info@bitz.tools</div>
      </div>
    </footer>
  );
};

export default Footer;
