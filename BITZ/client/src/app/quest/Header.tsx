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
    const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);
    
    const toggleMenu = (): void => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleEndQuestClick = (): void => {
        setShowConfirmPopup(true);
    };

    const handleConfirm = (): void => {
        setShowConfirmPopup(false);
        if (onEndQuest) {
            onEndQuest();
        }
    };

    const handleCancel = (): void => {
        setShowConfirmPopup(false);
    };

    return (
      <>
        <header className="flex justify-between items-center p-0 relative">
          <Link href="/" className="p-4">
              <img 
              src={logoSrc}
              alt="Bitz Logo"
              className="w-16 h-auto" 
              />
          </Link>
          
          <button 
            onClick={handleEndQuestClick}
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

        {/* Confirmation Popup */}
        {showConfirmPopup && (
          <div 
            className="fixed inset-0 flex items-center justify-center bg-[#000000DD] z-50"
            onClick={handleCancel}
          >
            <div 
              className="bg-[#61C899] p-8 w-64 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-8 text-white font-medium text-xl">
                Are you sure you<br />
                want to leave the<br />
                quest?
              </p>
              <button 
                onClick={handleConfirm}
                className="bg-white text-[#F95B5B] px-10 py-3 w-full font-medium border-1 border-[#F95B5B]"
              >
                YES
              </button>
            </div>
          </div>
        )}
      </>
    );
};

export default Header;