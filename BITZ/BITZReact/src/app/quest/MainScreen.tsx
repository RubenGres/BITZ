'use client';

import React, { useEffect, useState, useRef } from 'react';
import Header from '@/app/Header';
import { getConversationId } from '../User';

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

export const MainScreen: React.FC<MainScreenProps> = ({ onLocationChange, onGPSCoordinatesChange }) => {
  const [flavor, setFlavor] = useState<string | null>(null);
  const [conversationPrefix, setConversationPrefix] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');
  const [gpsCoordinates, setGpsCoordinates] = useState<string>('');
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [gpsFlashing, setGpsFlashing] = useState<boolean>(false);
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

  // Function to trigger GPS flash effect
  const flashGpsCoordinates = () => {
    setGpsFlashing(true);
    setTimeout(() => {
      setGpsFlashing(false);
    }, 300); // Flash for 0.1 second
  };

  // Get current GPS coordinates
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = `${latitude}, ${longitude}`;
          setGpsCoordinates(coords);
          // flashGpsCoordinates();
          
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

  // Get URL params and conversation ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const flavorParam = urlParams.get('flavor');
      setFlavor(flavorParam);
      
      // Get conversation ID prefix
      const conversationId = getConversationId();
      if (conversationId) {
        const prefix = conversationId.split('-')[0];
        setConversationPrefix(prefix);
      }
    }
  }, []);

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

      <main className="flex flex-col items-center justify-center h-4/5">
        <div className="text-white text-center">
          <img 
            src="/text/explore.svg" 
            alt="EXPLORE"
            className="w-[300px] h-auto mb-4 mx-auto"
          />
          <p className="text-white text-xl">BIODIVERSITY WITH BITZ</p>
        </div>

        <div className="bg-[#00000011] text-white p-10 mx-10 my-16 max-w-md mx-auto">
          <div className="text-left mb-3">
            <p className="text-lg mb-4">Quest Flavor: <b>{flavor || 'default'}</b></p>
            <p className="text-lg mb-4">Conversation ID: <b>{conversationPrefix || 'N/A'}</b></p>
            <p className="text-lg">
              Location: 
              <b 
                className={`text-sm transition-all duration-300 ${
                  gpsFlashing
                    ? 'text-[#f44928]' 
                    : 'text-white'
                }`}
              >
                &nbsp;GPS {gpsCoordinates || 'N/A'}
              </b>
            </p>
          
          <div>
            {isEditingLocation ? (
              <div className="relative inline-block mt-1">
                <div className="relative">
                  <input
                    id="location-input"
                    type="text"
                    value={locationInput}
                    onChange={handleLocationInputChange}
                    className="text-black px-3 py-2 rounded border border-white w-64 focus:outline-none focus:border-[#f44928]-500"
                    placeholder="Enter location name..."
                    autoFocus
                  />
                  {loading && (
                    <div className="absolute right-2 top-3 w-4 h-4 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                  )}
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div id="location-suggestions" className="absolute z-50 w-full bg-white rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.place_id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-black text-left text-sm"
                      >
                        {suggestion.display_name}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 flex gap-2 justify-center">
                  <button
                    onClick={saveLocation}
                    className="px-4 py-1 bg-white text-[#f44928] border border-[#f44928] rounded hover:bg-gray-100 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={toggleLocationEdit}
                    className="px-4 py-1 bg-transparent text-white border border-white rounded hover:bg-white hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <p className="break-words">
                  <b>{location || 'Detecting location...'}</b>
                </p>
                <button
                  onClick={toggleLocationEdit}
                  className="mt-2 mx-auto px-3 py-1 bg-transparent text-white border border-white rounded text-sm hover:bg-white hover:text-black transition-colors"
                >
                  Change location
                </button>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="relative">
          <button 
            className="flex items-center justify-center bg-white text-[#f44928] border-2 border-[#f44928] py-4 px-[90px]"
            onClick={() => {
              const cameraInput = document.getElementById('camera-input');
              if (cameraInput) {
                cameraInput.click();
              }
            }}
          >
            <img src="/icons/camera.svg" alt="Camera" className="w-6 h-6 mr-3" />
            <span className="text-xl tracking-widest">take photo</span>
          </button>
        </div>
      </main>
    </>
  );
}