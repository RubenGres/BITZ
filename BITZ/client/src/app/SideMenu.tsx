'use client';

import React, { useState } from 'react';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const [questDropdownOpen, setQuestDropdownOpen] = useState(true);
  const [visualizationsDropdownOpen, setVisualizationsDropdownOpen] = useState(true);

  return (
    <div 
      className={`fixed top-0 h-full bg-white shadow-lg transform transition-transform transition-opacity duration-300 z-100 border-l-2 border-green-500 ${
        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
      style={{
        backgroundColor: '#f6f9ec',
        /* Make the menu responsive: full width on small screens, up to 20rem on wider screens */
        width: 'min(100%, 20rem)',
        /* Align menu's right edge with the right edge of .site-container on wide screens, and fall back to viewport edge on small screens */
        right: 'calc((100% - min(100%, var(--site-max-width)))/2)'
      }}
    >
      <div className="p-4 flex justify-end">
        <button onClick={onClose} className="text-green-500 hover:text-green-700">
          ✕
        </button>
      </div>
      <nav>
        <ul>

          <li className="border border-green-500 p-4">
            <a href="/list" className="text-black uppercase font-medium block">My Quests</a>
          </li>

          <li className="border border-green-500 p-4">
            <a href="/explore" className="text-black uppercase font-medium block">Explore</a>
          </li>
          
          <li className="border border-green-500 p-4">
            <div>
              <button 
                className="text-black uppercase font-medium flex justify-between w-full"
              >
                Eyes On The Field
              </button>
              {questDropdownOpen && (
                <ul className="mt-2 ml-8 space-y-2">
                  <li><a href="/events/venn" className="text-green-600 hover:text-green-800 capitalize"> VENN canteen - Porto </a></li>
                </ul>
              )}
            </div>
          </li>

          <li className="border border-green-500 p-4">
            <a href="/about" className="text-black uppercase font-medium block">About</a>
          </li>

        </ul>
      </nav>
    </div>
  );
};

export default SideMenu;