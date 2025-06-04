import React from 'react';
import { API_URL } from '@/app/Constants';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet marker icons not showing properly in React
// We need to redefine the icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// This component ensures the map resizes correctly and fits all markers
function MapResizer({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  React.useEffect(() => {
    // Force a resize after component mounts
    setTimeout(() => {
      map.invalidateSize();
      
      // Fit bounds to show all markers
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { 
          padding: [20, 20], // Add some padding around the bounds
          maxZoom: 16 // Prevent zooming in too much for single points
        });
      }
    }, 250);
  }, [map, bounds]);
  
  return null;
}

// Function to create custom colored markers
const createCustomIcon = (color: string): L.Icon => {
  // Create a custom SVG icon with the specified color
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.3 12.5 28.5 12.5 28.5S25 20.8 25 12.5C25 5.6 19.4 0 12.5 0z" 
            fill="${color}" stroke="#000" stroke-width="1"/>
      <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
    </svg>
  `;
  
  const iconUrl = 'data:image/svg+xml;base64,' + btoa(svgIcon);
  
  return new L.Icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconUrl,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

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

interface MapComponentProps {
  speciesData: SpeciesRow[];
  questColors: Record<string, string>; // Maps questId to color
  mapCenter: [number, number];
}

const MapComponent: React.FC<MapComponentProps> = ({ speciesData, questColors, mapCenter }) => {
  // Create icons for each quest color
  const questIcons = React.useMemo(() => {
    const icons: Record<string, L.Icon> = {};
    Object.entries(questColors).forEach(([questId, color]) => {
      icons[questId] = createCustomIcon(color);
    });
    return icons;
  }, [questColors]);

  // Calculate bounds for all valid data points
  const bounds = React.useMemo(() => {
    const validPoints = speciesData.filter(species => 
      species.latitude && species.longitude && 
      !isNaN(Number(species.latitude)) && !isNaN(Number(species.longitude))
    );

    if (validPoints.length === 0) {
      return null;
    }

    // Create bounds from all valid points
    const latLngs = validPoints.map(species => 
      L.latLng(Number(species.latitude), Number(species.longitude))
    );

    return L.latLngBounds(latLngs);
  }, [speciesData]);

  // Use calculated center from bounds or fallback to provided mapCenter
  const calculatedCenter = React.useMemo(() => {
    if (bounds && bounds.isValid()) {
      const center = bounds.getCenter();
      return [center.lat, center.lng] as [number, number];
    }
    return mapCenter;
  }, [bounds, mapCenter]);

  return (
    <div className="h-full w-full" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <MapContainer 
        center={calculatedCenter} 
        zoom={2} // Start with a low zoom, will be adjusted by fitBounds
        style={{ height: '100%', width: '100%', flex: '1', minHeight: '500px', zIndex: 0 }}
      >
        {/* This ensures the map resizes properly and fits all markers */}
        <MapResizer bounds={bounds} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {speciesData.map((species, index) => {
          // Only create markers for entries with valid coordinates
          if (species.latitude && species.longitude && 
              !isNaN(Number(species.latitude)) && !isNaN(Number(species.longitude))) {
            
            const questIcon = questIcons[species.questId];
            
            return (
              <Marker 
                key={`${species.questId}-${index}`}
                position={[Number(species.latitude), Number(species.longitude)]} 
                icon={questIcon}
              >
                <Popup>
                  <div className="w-56" onClick={() => {window.location.href = `/view?id=${species.questId}`;}}>
                    <div className="font-medium mb-1">
                      {species.common_name || 'Unknown Species'}
                    </div>
                    {species.scientific_name && (
                      <div className="text-sm italic mb-2">{species.scientific_name}</div>
                    )}
                    {species.image_name ? (
                      <div className="mb-2">
                        <img
                          src={`${API_URL}/explore/images/${species.questId}/${species.image_name}?res=medium`}
                          alt={species.common_name || species.scientific_name || 'Species image'}
                          className="w-full h-40 object-cover rounded"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center mb-2">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      <div>Group: {species.taxonomic_group || 'Unknown'}</div>
                      <div>Confidence: {species.confidence || 'N/A'}</div>
                      {species.discovery_timestamp && (
                        <div>Discovered: {new Date(species.discovery_timestamp).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="text-xs font-medium mb-1 py-1 rounded mt-2" style={{ backgroundColor: questColors[species.questId]}}></div>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;