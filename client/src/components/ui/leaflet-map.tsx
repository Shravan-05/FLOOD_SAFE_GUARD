import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Road, RiverLevel } from '@shared/schema';
import { RISK_LEVELS, ROAD_STATUS } from '@/lib/floodUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Navigation } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Fix Leaflet icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored markers
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// User location marker icon (blue with pulsing effect)
const userIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative">
      <div style="background-color: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #2563eb;"></div>
      <div style="position: absolute; top: -10px; left: -10px; width: 40px; height: 40px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.2); animation: pulse 1.5s infinite;"></div>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Destination marker icon (green)
const destinationIcon = createColoredIcon('#22c55e');

// High risk marker icon (red)
const highRiskIcon = createColoredIcon('#ef4444');

// Medium risk marker icon (orange)
const mediumRiskIcon = createColoredIcon('#f97316');

// Low risk marker icon (green)
const lowRiskIcon = createColoredIcon('#22c55e');

// Component to center map on user's location
function SetViewOnUserLocation({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

// Handle map clicks for destination selection
function MapClickHandler({ 
  onMapClick 
}: { 
  onMapClick: (e: L.LeafletMouseEvent) => void 
}) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

type Route = {
  id: string | number;
  path: [number, number][];
  status: string;
};

type LeafletMapProps = {
  userLocation: { latitude: number; longitude: number } | null;
  roads?: Road[];
  riverLevels?: RiverLevel[];
  riskLevel?: string;
  onDestinationSelect?: (coords: { latitude: number; longitude: number }) => void;
};

export default function LeafletMap({
  userLocation,
  roads = [],
  riverLevels = [],
  riskLevel = RISK_LEVELS.LOW,
  onDestinationSelect
}: LeafletMapProps) {
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [safeRoutes, setSafeRoutes] = useState<Route[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  // Handle map click for destination selection - Only allow a single destination
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    // Clear previous destination and routes when setting a new one
    setSafeRoutes([]);
    
    const newDestination = {
      latitude: e.latlng.lat,
      longitude: e.latlng.lng
    };
    setDestination(newDestination);
    
    if (onDestinationSelect) {
      onDestinationSelect(newDestination);
    }
    
    // Fetch safe routes when destination is selected
    fetchSafeRoutes(newDestination);
  }, [onDestinationSelect, userLocation]);

  // Fetch safe routes between user location and destination
  const fetchSafeRoutes = async (dest: { latitude: number; longitude: number }) => {
    if (!userLocation) return;
    
    try {
      const res = await apiRequest(
        'GET',
        `/api/safe-routes?startLat=${userLocation.latitude}&startLong=${userLocation.longitude}&endLat=${dest.latitude}&endLong=${dest.longitude}`
      );
      const data = await res.json();
      setSafeRoutes(data);
    } catch (error) {
      console.error('Failed to fetch safe routes:', error);
      // If API fails, create a simple direct route
      const directRoute = [
        [userLocation.latitude, userLocation.longitude],
        [dest.latitude, dest.longitude]
      ] as [number, number][];
      
      setSafeRoutes([{
        id: 'direct',
        path: directRoute,
        status: ROAD_STATUS.SAFE
      }]);
    }
  };

  // Get route color based on status
  const getRouteColor = (status: string) => {
    switch (status) {
      case ROAD_STATUS.UNDER_FLOOD:
        return '#ef4444'; // red
      case ROAD_STATUS.NEAR_FLOOD:
        return '#f97316'; // amber
      case ROAD_STATUS.SAFE:
        return '#22c55e'; // green
      default:
        return '#3b82f6'; // blue
    }
  };

  // Get marker icon based on risk level
  const getRiskIcon = (level: string) => {
    switch (level) {
      case RISK_LEVELS.HIGH:
        return highRiskIcon;
      case RISK_LEVELS.MEDIUM:
        return mediumRiskIcon;
      case RISK_LEVELS.LOW:
        return lowRiskIcon;
      default:
        return lowRiskIcon;
    }
  };

  // Save map reference when the map is ready
  const setMapRef = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  // Center map on user location
  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.latitude, userLocation.longitude], 14);
    }
  };

  if (!userLocation) {
    return (
      <div className="w-full bg-gray-100 flex items-center justify-center h-96">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location Required</AlertTitle>
          <AlertDescription>
            Please enable location services to view the map.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[550px]">
      <MapContainer
        center={[userLocation.latitude, userLocation.longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        ref={setMapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map click handler for destination selection */}
        <MapClickHandler onMapClick={handleMapClick} />
        
        {/* User location marker */}
        <Marker 
          position={[userLocation.latitude, userLocation.longitude]} 
          icon={userIcon}
        >
          <Popup>
            <div className="text-sm font-medium">Your Location</div>
            <div className="text-xs text-gray-500">
              Lat: {userLocation.latitude.toFixed(6)}, Long: {userLocation.longitude.toFixed(6)}
            </div>
          </Popup>
        </Marker>
        
        {/* Destination marker */}
        {destination && (
          <Marker 
            position={[destination.latitude, destination.longitude]} 
            icon={destinationIcon}
          >
            <Popup>
              <div className="text-sm font-medium">Destination</div>
              <div className="text-xs text-gray-500">
                Lat: {destination.latitude.toFixed(6)}, Long: {destination.longitude.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Safe route polylines */}
        {safeRoutes.map((route, index) => (
          <Polyline
            key={`route-${index}`}
            positions={route.path}
            color={getRouteColor(route.status)}
            weight={5}
            opacity={0.7}
          >
            <Popup>
              <div className="text-sm font-medium">
                {route.status === ROAD_STATUS.SAFE ? 'Safe Route' : 
                 route.status === ROAD_STATUS.NEAR_FLOOD ? 'Caution: Near Flood' : 'Danger: Flooded Route'}
              </div>
            </Popup>
          </Polyline>
        ))}
        
        {/* Risk areas markers */}
        {roads.map((road) => {
          const midPoint = {
            lat: (road.startLat + road.endLat) / 2,
            lng: (road.startLong + road.endLong) / 2
          };
          
          let riskIcon;
          switch (road.status) {
            case ROAD_STATUS.UNDER_FLOOD:
              riskIcon = highRiskIcon;
              break;
            case ROAD_STATUS.NEAR_FLOOD:
              riskIcon = mediumRiskIcon;
              break;
            default:
              riskIcon = lowRiskIcon;
          }
          
          return (
            <Marker 
              key={road.id} 
              position={[midPoint.lat, midPoint.lng]} 
              icon={riskIcon}
            >
              <Popup>
                <div className="text-sm font-medium">{road.name}</div>
                <div className="text-xs text-gray-500">
                  Status: {road.status === ROAD_STATUS.UNDER_FLOOD ? 'Flooded' : 
                          road.status === ROAD_STATUS.NEAR_FLOOD ? 'Near Flood' : 'Safe'}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Set view component to update map center when user location changes */}
        <SetViewOnUserLocation center={[userLocation.latitude, userLocation.longitude]} />
      </MapContainer>
      
      {/* Map controls */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Button 
          onClick={centerOnUserLocation}
          className="flex items-center gap-2 bg-primary text-white hover:bg-primary-dark shadow-md border border-primary-dark font-medium transition-all duration-200"
          size="sm"
        >
          <Navigation className="h-4 w-4" />
          Return to My Location
        </Button>
      </div>
      
      {/* Map legend */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-md shadow-md p-4 z-[1000] border border-gray-100">
        <div className="text-sm font-medium mb-3 border-b pb-2">Map Legend</div>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
            <span className="ml-2 text-xs font-medium text-gray-700">High Risk Area</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-500 rounded-full shadow-sm"></div>
            <span className="ml-2 text-xs font-medium text-gray-700">Medium Risk Area</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
            <span className="ml-2 text-xs font-medium text-gray-700">Safe Route</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-600 rounded-full shadow-sm"></div>
            <span className="ml-2 text-xs font-medium text-gray-700">Your Location</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded-full shadow-sm"></div>
            <span className="ml-2 text-xs font-medium text-gray-700">Destination</span>
          </div>
        </div>
      </div>
      
      {/* Risk level indicator */}
      <div className={`absolute top-4 left-4 px-5 py-3 rounded-md shadow-md z-[1000] border ${
        riskLevel === RISK_LEVELS.HIGH ? 'bg-red-500 text-white border-red-600' :
        riskLevel === RISK_LEVELS.MEDIUM ? 'bg-orange-500 text-white border-orange-600' :
        'bg-green-500 text-white border-green-600'
      }`}>
        <div className="text-sm font-bold uppercase">Flood Risk Level</div>
        <div className="text-lg font-medium mt-1">{riskLevel}</div>
      </div>
      
      {/* Destination selection instruction */}
      {!destination && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-md shadow-md p-4 z-[1000] border border-gray-100 flex items-center space-x-2">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <div className="text-sm font-medium">Click on the map to select your destination</div>
        </div>
      )}
    </div>
  );
}