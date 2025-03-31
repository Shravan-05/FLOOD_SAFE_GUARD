import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/ui/header';
import MapComponent from '@/components/ui/map-component';
import RoadStatus from '@/components/ui/road-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { getUserLocation } from '@/lib/floodUtils';
import { apiRequest } from '@/lib/queryClient';

export default function MapsPage() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'STANDARD' | 'SATELLITE'>('STANDARD');
  
  // Fetch user location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (error) {
        setLocationError('Unable to access your location. Please enable location services.');
        console.error('Location error:', error);
      } finally {
        setIsLocationLoading(false);
      }
    };

    fetchLocation();
  }, []);

  // Fetch roads near user
  const { data: roads, isLoading: isRoadsLoading } = useQuery({
    queryKey: ['/api/roads', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      if (!userLocation) return [];
      const res = await apiRequest(
        'GET', 
        `/api/roads?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=10`
      );
      return await res.json();
    },
    enabled: !!userLocation,
  });

  // Fetch river levels near user
  const { data: riverLevels, isLoading: isRiverLevelsLoading } = useQuery({
    queryKey: ['/api/river-levels', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      if (!userLocation) return [];
      const res = await apiRequest(
        'GET', 
        `/api/river-levels?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=20`
      );
      return await res.json();
    },
    enabled: !!userLocation,
  });

  const isLoading = isLocationLoading || isRoadsLoading || isRiverLevelsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">Flood Risk Map</h1>
              <div className="space-x-2">
                <Button 
                  variant={mapView === 'STANDARD' ? 'default' : 'outline'}
                  onClick={() => setMapView('STANDARD')}
                  size="sm"
                >
                  Standard
                </Button>
                <Button 
                  variant={mapView === 'SATELLITE' ? 'default' : 'outline'}
                  onClick={() => setMapView('SATELLITE')}
                  size="sm"
                >
                  Satellite
                </Button>
              </div>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading map data...</span>
              </div>
            ) : locationError ? (
              <Alert variant="destructive" className="my-4">
                <AlertTitle>Location Error</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Main Map */}
                <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Flood Risk Map</h3>
                  </div>
                  
                  {/* Map with expanded height for better visibility */}
                  <div className="h-[70vh]">
                    <MapComponent 
                      userLocation={userLocation}
                      roads={roads || []}
                      riverLevels={riverLevels || []}
                      mapType={mapView}
                      expanded={true}
                    />
                  </div>
                </div>
                
                {/* Sidebar with flood info */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Legend Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Map Legend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                          <span className="ml-2 text-sm">High Risk Area</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                          <span className="ml-2 text-sm">Medium Risk Area</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span className="ml-2 text-sm">Safe Route</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-red-500 rounded-full border border-white"></div>
                          <span className="ml-2 text-sm">Your Location</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <span className="ml-2 text-sm">River</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Safe Routes Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Safe Routes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(roads || []).length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                          <RoadStatus 
                            roads={roads || []}
                            compact={true}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No road data available in this area
                        </div>
                      )}
                      <Button className="w-full mt-4">
                        Get Directions to Safe Area
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Quick Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-medium">Latitude:</span> {userLocation?.latitude.toFixed(6)}
                        </div>
                        <div>
                          <span className="font-medium">Longitude:</span> {userLocation?.longitude.toFixed(6)}
                        </div>
                        <div>
                          <span className="font-medium">Accuracy:</span> High
                        </div>
                        <div>
                          <span className="font-medium">Last Updated:</span> Just now
                        </div>
                        <Button className="w-full mt-2" variant="outline" onClick={() => location.reload()}>
                          Refresh Location
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
