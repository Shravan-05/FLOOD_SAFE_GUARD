import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ZoomIn, ZoomOut, MapPin, Navigation } from 'lucide-react';
import { Road, RiverLevel } from '@shared/schema';

type MapComponentProps = {
  userLocation: { latitude: number; longitude: number } | null;
  roads?: Road[];
  riverLevels?: RiverLevel[];
  mapType?: 'STANDARD' | 'SATELLITE';
  expanded?: boolean;
};

// This would be replaced with an actual map library like Google Maps or Mapbox
// For this implementation, we'll create a visual representation
export default function MapComponent({
  userLocation,
  roads = [],
  riverLevels = [],
  mapType = 'STANDARD',
  expanded = false
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [zoom, setZoom] = useState(15);

  // Simulate map loading
  useEffect(() => {
    if (userLocation) {
      const timer = setTimeout(() => {
        setIsMapLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userLocation]);

  const mapHeight = expanded ? '70vh' : 'calc(100vh - 400px)';

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 1, 20));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 1, 1));
  };

  // Count roads by status
  const underFloodRoads = roads.filter(road => road.status === 'UNDER_FLOOD').length;
  const nearFloodRoads = roads.filter(road => road.status === 'NEAR_FLOOD').length;
  const safeRoads = roads.filter(road => road.status === 'SAFE').length;

  if (!userLocation) {
    return (
      <div 
        className="w-full bg-gray-100 flex items-center justify-center"
        style={{ height: mapHeight }}
      >
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
    <div 
      ref={mapContainerRef}
      className="w-full relative overflow-hidden"
      style={{ height: mapHeight }}
    >
      {isMapLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-500">Loading map...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Map Background */}
          <div className="absolute inset-0 bg-gray-200">
            <img 
              src={mapType === 'SATELLITE' ? 
                "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=800&q=80" : 
                "https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=800&q=80"
              } 
              alt="Map" 
              className="object-cover w-full h-full opacity-75" 
            />
            
            {/* Flood overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-blue-500 opacity-40 pointer-events-none"></div>
            
            {/* User location marker */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="h-6 w-6 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </div>
            
            {/* Safe route line - would be dynamic in a real implementation */}
            <div className="absolute top-1/2 left-1/2 w-32 h-1 bg-green-500 transform -translate-y-1/2 rotate-45"></div>
            
            {/* Unsafe route line */}
            <div className="absolute top-1/2 left-1/2 w-40 h-1 bg-red-500 transform -translate-y-1/2 -rotate-12"></div>
            
            {/* Map controls */}
            <div className="absolute bottom-4 right-4 bg-white rounded-md shadow-md p-2">
              <div className="flex flex-col space-y-2">
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-6 w-6" />
                </Button>
              </div>
            </div>
            
            {/* Map legend */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-md shadow-md p-3">
              <div className="text-sm font-medium mb-2">Map Legend</div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="ml-2 text-xs">High Risk Area</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                  <span className="ml-2 text-xs">Medium Risk Area</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="ml-2 text-xs">Safe Route</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full border border-white"></div>
                  <span className="ml-2 text-xs">Your Location</span>
                </div>
              </div>
            </div>
            
            {/* Current coordinates */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-md shadow-md p-2 text-xs">
              <div>Lat: {userLocation.latitude.toFixed(6)}</div>
              <div>Lng: {userLocation.longitude.toFixed(6)}</div>
              <div>Zoom: {zoom}</div>
            </div>
            
            {/* Road status summary */}
            <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-md shadow-md p-3">
              <div className="text-sm font-medium mb-2">Road Status</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Under Flood:</span>
                  <span className="text-xs font-medium text-red-500">{underFloodRoads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Near Flood:</span>
                  <span className="text-xs font-medium text-amber-500">{nearFloodRoads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Safe:</span>
                  <span className="text-xs font-medium text-green-500">{safeRoads}</span>
                </div>
              </div>
            </div>
            
            {/* River data */}
            {riverLevels.length > 0 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-md shadow-md p-2">
                <div className="text-xs font-medium">
                  Musi River: {riverLevels[0].level}m (Critical: {riverLevels[0].criticalThreshold}m)
                </div>
              </div>
            )}
            
            {/* Recenter button */}
            <Button 
              variant="secondary" 
              size="sm"
              className="absolute bottom-16 right-4 flex items-center gap-1"
            >
              <Navigation className="h-4 w-4" />
              Recenter
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
