'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import SideMenu from '@/app/SideMenu';
import Link from 'next/link';

// Define an interface for the Header component props
interface HeaderProps {
  menuColor?: string;
  logoSrc?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  menuColor = 'text-green-500',
  logoSrc = '/logo/bitz_green.svg'
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    
    const toggleMenu = (): void => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
    <div>
        <header className="flex justify-between items-center p-4">
        <Link href="/">
            <img 
            src={logoSrc}
            alt={`Bitz Logo`}
            className="w-16 h-auto" 
            />
        </Link>
        <button 
        onClick={toggleMenu} 
        className={`${menuColor} p-2 rounded-full hover:bg-opacity-20 hover:bg-current`}
        >
        <Menu size={45} />
        </button>

        </header>

        <SideMenu isOpen={isMenuOpen} onClose={toggleMenu} />
    </div>
  );
};

export default Header;