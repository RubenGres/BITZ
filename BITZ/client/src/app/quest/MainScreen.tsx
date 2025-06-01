'use client';

import React, { useEffect, useState, useRef } from 'react';
import Header from '@/app/Header';
import { getConversationId } from '../User';
import DisclaimerPopup from './DisclaimerPopup'; // Adjust path as needed

// Define the type for location suggestions
interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

interface MainScreenProps {
  onLocationChange?: (location: string) => void;
  onGPSCoordinatesChange?: (gpsCoordinates: string) => void;
}

// Flavor options configuration
const FLAVOR_OPTIONS = [
  { key: 'basic', name: 'Basic' },
  { key: 'expert', name: 'Expert' },
  { key: 'myths', name: 'Myth & Culture' }
];

export const MainScreen: React.FC<MainScreenProps> = ({ onLocationChange, onGPSCoordinatesChange }) => {
  const [flavor, setFlavor] = useState<string>('basic'); // Default to basic
  const [conversationPrefix, setConversationPrefix] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');
  const [gpsCoordinates, setGpsCoordinates] = useState<string>('');
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [gpsFlashing, setGpsFlashing] = useState<boolean>(false);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(true);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (onLocationChange) {
      onLocationChange(location);
    }
  }, [location, onLocationChange]);

  useEffect(() => {
    if (onGPSCoordinatesChange) {
      onGPSCoordinatesChange(gpsCoordinates);
    }
  }, [gpsCoordinates, onGPSCoordinatesChange]);

  // Check if user has already accepted terms
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasAcceptedTerms = localStorage.getItem('bitz-terms-accepted');
      if (hasAcceptedTerms === 'true') {
        setShowDisclaimer(false);
      }
    }
  }, []);

  // Function to trigger GPS flash effect
  const flashGpsCoordinates = () => {
    setGpsFlashing(true);
    setTimeout(() => {
      setGpsFlashing(false);
    }, 300); // Flash for 0.3 second
  };

  // Get current GPS coordinates
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = `${latitude}, ${longitude}`;
          setGpsCoordinates(coords);
          
          // Get location name from coordinates
          await getLocationFromCoordinates(latitude, longitude);
        },
        (error) => {
          console.error('Error getting GPS coordinates:', error);
          setGpsCoordinates('N/A');
        }
      );
    }
  }, []);

  // Get URL params and conversation ID, also check for existing flavor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const flavorParam = urlParams.get('flavor');
      
      // Set flavor from URL if available, otherwise keep default
      if (flavorParam && FLAVOR_OPTIONS.some(option => option.key === flavorParam)) {
        setFlavor(flavorParam);
      }
      
      // Get conversation ID prefix
      const conversationId = getConversationId();
      if (conversationId) {
        const prefix = conversationId.split('-')[0];
        setConversationPrefix(prefix);
      }
    }
  }, []);

  // Update URL when flavor changes
  const handleFlavorChange = (newFlavor: string) => {
    setFlavor(newFlavor);
    
    // Update URL to include the new flavor
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('flavor', newFlavor);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Handler functions for disclaimer
  const handleAcceptTerms = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bitz-terms-accepted', 'true');
    }
    setShowDisclaimer(false);
  };

  const handleViewTerms = () => {
    // Navigate to the terms page - adjust the route as needed
    window.open('/terms', '_blank'); // Opens in new tab
    // OR use your router: router.push('/terms');
  };

  // Handle camera input
  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Process the image file
      console.log('Image captured:', file);
      // Add your image processing logic here
    }
  };

  // Get location name from GPS coordinates using Nominatim
  const getLocationFromCoordinates = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
      const data = await response.json();
      if (data.display_name) {
        setLocation(data.display_name);
        setLocationInput(data.display_name);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  // Search for locations using Nominatim
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debounce
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationInput(value);
    setLocation(value);
    
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Set new timeout for debounced search
    debounceTimeout.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.display_name);
    setGpsCoordinates(`${suggestion.lat}, ${suggestion.lon}`);
    setLocationInput(suggestion.display_name);
    setShowSuggestions(false);
    flashGpsCoordinates();
    setIsEditingLocation(false);
  };

  // Toggle location editing mode
  const toggleLocationEdit = () => {
    if (isEditingLocation) {
      setLocationInput(location);
      setShowSuggestions(false);
    } else {
      // Empty the input field when starting to edit
      setLocationInput('');
    }
    setIsEditingLocation(!isEditingLocation);
  };

  // Save location when user confirms
  const saveLocation = async () => {
    setLocation(locationInput);
    setIsEditingLocation(false);
    setShowSuggestions(false);

    // Update GPS coordinates for the manually entered location
    // Search for the location to get its coordinates
    if (locationInput.trim()) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setGpsCoordinates(`${lat}, ${lon}`);
          flashGpsCoordinates();
        }
      } catch (error) {
        console.error('Error updating GPS coordinates:', error);
      }
    }
  };

  // Handle click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const suggestionBox = document.getElementById('location-suggestions');
      const locationInput = document.getElementById('location-input');
      
      if (suggestionBox && !suggestionBox.contains(event.target as Node) && 
          locationInput && !locationInput.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <>
      <Header menuColor="text-white" logoSrc="/logo/bitz_white.svg" />

      {/* Disclaimer Popup */}
      {showDisclaimer && (
        <DisclaimerPopup 
          onAccept={handleAcceptTerms} 
          onViewTerms={handleViewTerms}
        />
      )}

      <main className="flex flex-col items-center px-4 pt-16">
        <div className="text-white text-center">
          <img 
            src="/text/explore.svg" 
            alt="EXPLORE"
            className="w-[300px] h-auto mb-4 mx-auto"
          />
          <p className="text-white text-xl">BIODIVERSITY WITH BITZ</p>
        </div>

        {/* Flavor Selection */}
        <div className="mt-8 mb-6">
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {FLAVOR_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleFlavorChange(option.key)}
                className={`px-6 py-3 border-2 transition-all duration-200 ${
                  flavor === option.key
                    ? 'bg-white text-[#f44928] border-white'
                    : 'bg-transparent text-white border-white/50 hover:bg-white/10 hover:border-white'
                }`}
              >
                <span className="font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Camera Button */}
        <div className="relative">
          <button 
            className="flex items-center justify-center bg-white text-[#f44928] border-2 border-[#f44928] py-4 px-[90px] hover:bg-gray-50 transition-colors shadow-lg"
            onClick={() => {
              const cameraInput = document.getElementById('camera-input');
              if (cameraInput) {
                cameraInput.click();
              }
            }}
          >
            <img src="/icons/camera.svg" alt="Camera" className="w-6 h-6 mr-3" />
            <span className="text-xl tracking-widest font-medium">take photo</span>
          </button>
        </div>

        {/* Hidden Camera Input */}
        <input
          id="camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleCameraInput}
        />

        {/* Location Display - Under Camera Button */}
        <div className="mt-8 text-center">
          {isEditingLocation ? (
            <div className="relative">
              <div className="flex items-center justify-center gap-2">
                <input
                  id="location-input"
                  type="text"
                  value={locationInput}
                  onChange={handleLocationInputChange}
                  className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 border border-white/30 text-center focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all placeholder-white/50 min-w-[280px]"
                  placeholder="Search for a location..."
                  autoFocus
                />
                {loading && (
                  <div className="w-4 h-4 border-t-2 border-white animate-spin"></div>
                )}
              </div>
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div id="location-suggestions" className="absolute z-50 w-full max-w-md mx-auto left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-xl mt-2 max-h-60 overflow-y-auto border border-white/20">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-3 hover:bg-white/20 cursor-pointer text-gray-800 text-left text-sm border-b border-gray-200/50 last:border-b-0"
                    >
                      {suggestion.display_name}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-3 flex gap-2 justify-center">
                <button
                  onClick={saveLocation}
                  className="px-6 py-2 bg-white text-[#f44928] hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={toggleLocationEdit}
                  className="px-6 py-2 bg-transparent text-white border border-white/50 hover:bg-white/10 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-white mb-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm opacity-75">Current Location</span>
              </div>
              
              <button 
                onClick={toggleLocationEdit}
                className="text-white text-lg font-medium max-w-md mx-auto hover:text-white/80 transition-colors cursor-pointer"
              >
                {location || 'Detecting location...'}
              </button>
              
              <div className="flex items-center justify-center text-sm">
                <span className={`transition-all duration-300 ${gpsFlashing ? 'text-[#f44928]' : 'text-white/70'}`}>
                  GPS: {gpsCoordinates || 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};