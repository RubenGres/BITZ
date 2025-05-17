// components/SpeciesInfoPanel.tsx
import React from 'react';
import { API_URL } from '@/app/Constants';
import { SpeciesInfo } from '../models/types';

interface SpeciesInfoPanelProps {
    questId: string;
    species: SpeciesInfo | null;
    isOpen: boolean;
    onClose: () => void;
    isMobile?: boolean;
}

const SpeciesInfoPanel: React.FC<SpeciesInfoPanelProps> = ({ 
    questId, 
    species, 
    isOpen, 
    onClose, 
    isMobile = false 
}) => {
    if (!species) return null;

    return (
        <div 
            className={`fixed bg-white shadow-xl transition-all duration-300 ease-in-out z-50 
                ${isMobile 
                    ? `bottom-0 left-0 right-0 rounded-t-xl ${isOpen ? 'h-4/5' : 'h-0'}`
                    : `top-0 right-0 h-full ${isOpen ? 'w-96' : 'w-0'}`
                }`}
        >
            {isOpen && (
                <div className="flex flex-col h-full">
                    {/* Header with close button */}
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold truncate">{species.name}</h2>
                        <button 
                            onClick={onClose} 
                            className="p-1 rounded-full hover:bg-gray-100"
                            aria-label="Close panel"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {species.image_filename && (
                            <div className="mb-4">
                                <img 
                                    src={`${API_URL}/explore/images/${questId}/${species.image_filename}`} 
                                    alt={species.name}
                                    className="w-full object-cover rounded-lg mb-2"
                                />
                            </div>
                        )}
                        
                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">Description</h3>
                            <p className="text-gray-800">{species.what_is_it}</p>
                        </div>
                        
                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">Additional Information</h3>
                            <p className="text-gray-800">{species.information}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeciesInfoPanel;