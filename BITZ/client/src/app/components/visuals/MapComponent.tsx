import React from 'react';
import { API_URL } from '@/app/Constants';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import FullscreenImageModal from '@/app/components/FullscreenImageModal';

// Fix for Leaflet marker icons not showing properly in React
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
    setTimeout(() => {
      map.invalidateSize();
      
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { 
          padding: [20, 20],
          maxZoom: 16
        });
      }
    }, 250);
  }, [map, bounds]);
  
  return null;
}

// Function to create custom colored markers
const createCustomIcon = (color: string): L.Icon => {
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

interface MarkerClusterLayerProps {
  speciesData: SpeciesRow[];
  questIcons: Record<string, L.Icon>;
  questColors: Record<string, string>;
  onImageClick: (src: string, alt: string) => void;
  onViewQuest: (questId: string) => void;
}

// Custom component that adds marker clustering using Leaflet.markercluster
function MarkerClusterLayer({ 
  speciesData, 
  questIcons, 
  questColors, 
  onImageClick, 
  onViewQuest 
}: MarkerClusterLayerProps) {
  const map = useMap();
  const clusterGroupRef = React.useRef<L.MarkerClusterGroup | null>(null);

  React.useEffect(() => {
    if (!map) return;

    // Create marker cluster group with custom options
    const markerClusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      // Custom cluster icon function
      iconCreateFunction: function (cluster) {
        const markers = cluster.getAllChildMarkers();
        
        // Count markers by quest to determine dominant color
        const questCounts: Record<string, number> = {};
        markers.forEach((marker: any) => {
          const questId = marker.options.questId;
          if (questId) {
            questCounts[questId] = (questCounts[questId] || 0) + 1;
          }
        });
        
        // Find the quest with most markers in this cluster
        let dominantQuestId = '';
        let maxCount = 0;
        Object.entries(questCounts).forEach(([questId, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantQuestId = questId;
          }
        });
        
        const color = questColors[dominantQuestId] || '#3388ff';
        const count = markers.length;
        
        // Create custom cluster icon
        return L.divIcon({
          html: `<div style="
            background-color: ${color}; 
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
            border: 3px solid rgba(255,255,255,0.8); 
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            font-size: 14px;
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40, true),
        });
      }
    });

    // Add markers to cluster group
    speciesData.forEach((species, index) => {
      if (species.latitude && species.longitude && 
          !isNaN(Number(species.latitude)) && !isNaN(Number(species.longitude))) {
        
        const questIcon = questIcons[species.questId];
        const imageSrc = `${API_URL}/explore/images/${species.questId}/${species.image_name}?res=medium`;
        const imageAlt = species.common_name || species.scientific_name || 'Species image';
        
        // Create marker with custom questId property
        const marker = L.marker(
          [Number(species.latitude), Number(species.longitude)],
          { 
            icon: questIcon,
            // @ts-ignore - Add custom property for cluster color calculation
            questId: species.questId
          }
        );

        // Create popup content as DOM element
        const popupContent = document.createElement('div');
        popupContent.className = 'w-56';
        popupContent.innerHTML = `
          <div class="font-medium mb-1">
            ${species.common_name || 'Unknown Species'}
          </div>
          ${species.scientific_name ? `<div class="text-sm italic mb-2">${species.scientific_name}</div>` : ''}
          ${species.image_name ? `
            <div class="mb-2">
              <img
                src="${imageSrc}"
                alt="${imageAlt}"
                class="w-full h-40 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity species-image"
                loading="lazy"
              />
            </div>
          ` : `
            <div class="w-full h-32 bg-gray-200 rounded flex items-center justify-center mb-2">
              <span class="text-gray-400 text-xs">No image</span>
            </div>
          `}
          <div class="text-xs text-gray-600">
            <div>Group: ${species.taxonomic_group || 'Unknown'}</div>
            <div>Confidence: ${species.confidence || 'N/A'}</div>
            ${species.discovery_timestamp ? `<div>Discovered: ${new Date(species.discovery_timestamp).toLocaleDateString()}</div>` : ''}
          </div>
          <div 
            class="text-xs font-medium text-black text-center py-2 rounded mt-2 cursor-pointer hover:opacity-80 transition-opacity view-quest-btn" 
            style="background-color: ${questColors[species.questId]}"
          >
            View Quest
          </div>
        `;

        // Add click event listeners after popup content is added to DOM
        marker.on('popupopen', () => {
          const img = popupContent.querySelector('.species-image');
          if (img) {
            img.addEventListener('click', () => onImageClick(imageSrc, imageAlt));
          }

          const viewQuestBtn = popupContent.querySelector('.view-quest-btn');
          if (viewQuestBtn) {
            viewQuestBtn.addEventListener('click', () => onViewQuest(species.questId));
          }
        });

        marker.bindPopup(popupContent);
        markerClusterGroup.addLayer(marker);
      }
    });

    // Add cluster group to map
    map.addLayer(markerClusterGroup);
    clusterGroupRef.current = markerClusterGroup;

    // Cleanup function - remove cluster group when component unmounts
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, speciesData, questIcons, questColors, onImageClick, onViewQuest]);

  return null;
}

interface MapComponentProps {
  speciesData: SpeciesRow[];
  questColors: Record<string, string>;
  mapCenter: [number, number];
}

const MapComponent: React.FC<MapComponentProps> = ({ speciesData, questColors, mapCenter }) => {
  const [fullscreenImage, setFullscreenImage] = React.useState<{
    src: string;
    alt: string;
  } | null>(null);

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

  const handleImageClick = React.useCallback((imageSrc: string, alt: string) => {
    setFullscreenImage({ src: imageSrc, alt });
  }, []);

  const handleViewQuest = React.useCallback((questId: string) => {
    window.location.href = `/view?id=${questId}`;
  }, []);

  return (
    <div className="h-full w-full" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <MapContainer 
        center={calculatedCenter} 
        zoom={2}
        style={{ height: '100%', width: '100%', flex: '1', minHeight: '500px', zIndex: 0 }}
      >
        <MapResizer bounds={bounds} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MarkerClusterLayer
          speciesData={speciesData}
          questIcons={questIcons}
          questColors={questColors}
          onImageClick={handleImageClick}
          onViewQuest={handleViewQuest}
        />
      </MapContainer>

      <FullscreenImageModal
        src={fullscreenImage?.src || ''}
        alt={fullscreenImage?.alt || ''}
        isOpen={!!fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </div>
  );
};

export default MapComponent;