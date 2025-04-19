'use client';

import React, { useState } from 'react';
import { Menu, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Define an interface for the Header component props
interface HeaderProps {
  logoSrc?: string;
  onEndQuest?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  logoSrc = '/logo/bitz_green.svg',
  onEndQuest
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    
    const toggleMenu = (): void => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
      <header className="flex justify-between items-center p-0 relative">
        <Link href="/" className="p-4">
            <img 
            src={logoSrc}
            alt="Bitz Logo"
            className="w-16 h-auto" 
            />
        </Link>
        
        <button 
          onClick={onEndQuest}
          className="bg-[#12472d] text-white px-4 py-2 h-full rounded-l flex items-center"
        >
          <span className="mr-2">END QUEST</span>
          <img 
            src="/icons/arrows_white.svg"
            alt="Arrow"
            className="h-[15px]" 
          />
        </button>
      </header>
    );
};

export default Header;