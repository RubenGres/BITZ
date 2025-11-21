// src/app/utils/dataFilters.ts
import * as geolib from 'geolib';
import { FARM_LOCATIONS } from '@/app/Constants';

// Assuming SpeciesRow interface is available or re-defined here for utility context
interface SpeciesRow {
  'image_name': string;
  'taxonomic_group': string;
  'scientific_name': string;
  'common_name': string;
  'discovery_timestamp': string;
  'confidence': string;
  'notes': string;
  'latitude': string;
  'longitude': string;
  'questId': string;
}

/**
 * Attempts to extract the first level domain (SLD + TLD) from the current hostname.
 * @returns The extracted domain name key or null.
 */
export const getDomainKey = (): string | null => {
  // Check for window existence to ensure this only runs client-side
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || !isNaN(Number(hostname.replace(/\./g, '')))) {
    return null;
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0]
  }

  return null;
};

/**
 * Applies all necessary global data filters, including the domain-specific 5km radius filter.
 * @param speciesData The raw array of all species observations.
 * @returns The filtered array of species observations.
 */
export const applyGlobalFilters = (speciesData: SpeciesRow[]): SpeciesRow[] => {
  let data = speciesData;

  const domainKey = getDomainKey();
  const farmLocations = domainKey ? FARM_LOCATIONS[domainKey] : undefined;
  
  // Apply domain-based geographic filter
  if (farmLocations && farmLocations.length > 0) {
    console.log(`Applying geographic filter for domain key: ${domainKey}`);
    
    // 1. Prepare farm coordinates in a format geolib understands
    const farmCoords = farmLocations.map(farm => {
      const [latitude, longitude] = farm.coordinates.split(',').map(c => Number(c.trim()));
      return { latitude, longitude }; // geolib expects 'latitude' and 'longitude' keys
    });
    
    const MAX_DISTANCE_METERS = 5000; // 5 km converted to meters
    
    data = data.filter(row => {
      const obsLat = Number(row.latitude);
      const obsLng = Number(row.longitude);
      
      // Skip if coordinates are invalid
      if (isNaN(obsLat) || isNaN(obsLng)) return false;

      // Observation point format
      const observation = { latitude: obsLat, longitude: obsLng };

      // Check distance to all registered farms for this domain
      // Keep the observation if it is within MAX_DISTANCE_METERS of *any* farm.
      return farmCoords.some(farm => {
        const distanceMeters = geolib.getDistance(observation, farm);
        return distanceMeters <= MAX_DISTANCE_METERS; 
      });
    });
  }

  return data;
};

// Optional: You can also export the domain check result if needed for UI messaging
export const getActiveFilterDomainKey = (): string | null => getDomainKey();