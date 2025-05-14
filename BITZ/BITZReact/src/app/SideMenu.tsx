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
      className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-20 border-l-2 border-green-500 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}

      style={{
        backgroundColor: '#f6f9ec',
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
            <a href="/about" className="text-black uppercase font-medium block">About</a>
          </li>
          <li className="border border-green-500 p-4">
            <a href="/list" className="text-black uppercase font-medium block">Explore</a>
          </li>
          
          <li className="border border-green-500 p-4">
            <div>
              <button 
                className="text-black uppercase font-medium flex justify-between w-full"
              >
                Quest Flavors
              </button>
              {questDropdownOpen && (
                <ul className="mt-2 ml-8 space-y-2">
                  <li><a href="/quest?flavor=basic" className="text-green-600 hover:text-green-800 capitalize">Basic</a></li>
                  <li><a href="/quest?flavor=noob" className="text-green-600 hover:text-green-800 capitalize">Noob</a></li>
                  <li><a href="/quest?flavor=expert" className="text-green-600 hover:text-green-800 capitalize">Expert</a></li>
                  <li><a href="/quest?flavor=chain" className="text-green-600 hover:text-green-800 capitalize">Chain Reaction</a></li>
                  <li><a href="/quest?flavor=myths" className="text-green-600 hover:text-green-800 capitalize">Myth & Culture</a></li>
                </ul>
              )}
            </div>
          </li>
          
          <li className="border border-green-500  p-4">
            <div>
              <button 
                className="text-black uppercase font-medium flex justify-between w-full"
              >
                Visualizations
              </button>
              {visualizationsDropdownOpen && (
                <ul className="mt-2 ml-8 space-y-2">
                  <li><a href="https://oaak.rubengr.es/images/" className="text-green-600 hover:text-green-800 capitalize">Images</a></li>
                  <li><a href="https://oaak.rubengr.es/viz/graph/" className="text-green-600 hover:text-green-800 capitalize">Graph View</a></li>
                  <li><a href="https://oaak.rubengr.es/map" className="text-green-600 hover:text-green-800 capitalize">Map View</a></li>
                  <li><a href="https://oaak.rubengr.es/viz/3d/" className="text-green-600 hover:text-green-800 capitalize">3D View</a></li>
                </ul>
              )}
            </div>
          </li>
          
          <li className="border border-green-500  p-4">
            <a href="#" className="text-black uppercase font-medium block">Dashboard</a>
          </li>
          
          <li className="border border-green-500  p-4">
            <a href="/info" className="text-black uppercase font-medium block">More Info</a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default SideMenu;