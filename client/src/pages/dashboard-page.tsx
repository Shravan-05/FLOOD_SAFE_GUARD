import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/ui/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RiskStatusBanner from '@/components/ui/risk-status-banner';
import MapComponent from '@/components/ui/map-component';
import RoadStatus from '@/components/ui/road-status';
import { Button } from '@/components/ui/button';
import { getUserLocation } from '@/lib/floodUtils';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch user location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        
        // Send location to the backend
        if (location) {
          await apiRequest('POST', '/api/locations', location);
        }
      } catch (error) {
        setLocationError('Unable to access your location. Please enable location services.');
        console.error('Location error:', error);
      } finally {
        setIsLocationLoading(false);
      }
    };

    fetchLocation();
  }, []);

  // Fetch current flood risk
  const { data: floodRisk, isLoading: isFloodRiskLoading } = useQuery({
    queryKey: ['/api/flood-risks/current'],
    enabled: !!userLocation,
  });

  // Fetch roads near user
  const { data: roads, isLoading: isRoadsLoading } = useQuery({
    queryKey: ['/api/roads', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      if (!userLocation) return [];
      const res = await apiRequest(
        'GET', 
        `/api/roads?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=5`
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
        `/api/river-levels?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=10`
      );
      return await res.json();
    },
    enabled: !!userLocation,
  });

  // Determine the closest river level
  const closestRiver = riverLevels?.length > 0 ? riverLevels[0] : null;

  // Count safe routes
  const safeRoutes = roads?.filter(road => road.status === 'SAFE') || [];

  const isLoading = isLocationLoading || isFloodRiskLoading || isRoadsLoading || isRiverLevelsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading data...</span>
              </div>
            ) : locationError ? (
              <Alert variant="destructive" className="my-4">
                <AlertTitle>Location Error</AlertTitle>
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Current Risk Status Banner */}
                <RiskStatusBanner 
                  riskLevel={floodRisk?.riskLevel || 'LOW'} 
                  waterLevel={floodRisk?.waterLevel || 0} 
                  thresholdLevel={floodRisk?.thresholdLevel || 0} 
                />

                {/* Risk Overview Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                  {/* Risk Level Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Current Risk Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-semibold ${
                        floodRisk?.riskLevel === 'HIGH' ? 'text-red-500' :
                        floodRisk?.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-green-500'
                      }`}>
                        {floodRisk?.riskLevel || 'LOW'}
                      </div>
                      <div className="mt-4 text-sm">
                        <Button variant="link" className="px-0">View details</Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Nearest River Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Nearest River</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-semibold text-gray-900">
                        {closestRiver ? 'Musi River' : 'N/A'}
                      </div>
                      <div className="mt-4 text-sm">
                        <Button variant="link" className="px-0">View on map</Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Safe Routes Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Safe Routes Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-semibold text-gray-900">
                        {safeRoutes.length}
                      </div>
                      <div className="mt-4 text-sm">
                        <Button variant="link" className="px-0">Get directions</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Map and Road Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Map Container */}
                  <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Current Location & Risk Map</h3>
                    </div>
                    
                    {/* Map Component */}
                    <MapComponent 
                      userLocation={userLocation}
                      roads={roads || []}
                      riverLevels={riverLevels || []}
                    />
                  </div>

                  {/* Road Status and Safe Routes */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Road Status & Safe Routes</h3>
                    </div>
                    
                    {/* Road Status Component */}
                    <RoadStatus roads={roads || []} />
                  </div>
                </div>
                
                {/* Historical Data & Predictions */}
                <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Flood Risk Assessment</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">River Level Metrics</h4>
                        <div className="mt-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div className="col-span-1">
                            <dt className="text-xs font-medium text-gray-500">Current Level</dt>
                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                              {closestRiver ? `${closestRiver.level} meters` : 'N/A'}
                            </dd>
                          </div>
                          <div className="col-span-1">
                            <dt className="text-xs font-medium text-gray-500">Critical Threshold</dt>
                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                              {closestRiver?.criticalThreshold ? `${closestRiver.criticalThreshold} meters` : 'N/A'}
                            </dd>
                          </div>
                          <div className="col-span-1">
                            <dt className="text-xs font-medium text-gray-500">24hr Change</dt>
                            <dd className="mt-1 text-sm font-semibold text-red-500">
                              {closestRiver ? '+5 meters' : 'N/A'}
                            </dd>
                          </div>
                          <div className="col-span-1">
                            <dt className="text-xs font-medium text-gray-500">Forecast (24hr)</dt>
                            <dd className="mt-1 text-sm font-semibold text-red-500">
                              {floodRisk?.riskLevel === 'HIGH' ? 'Rising' : 'Stable'}
                            </dd>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Risk Assessment Model</h4>
                        <div className="mt-1 bg-gray-50 rounded-md p-3">
                          <div className="text-sm text-gray-600">
                            <p>The current flood risk assessment is based on the following factors:</p>
                            <ul className="mt-2 pl-5 list-disc space-y-1">
                              <li>Rainfall: <span className="font-medium">208mm (Heavy)</span></li>
                              <li>River Proximity: <span className="font-medium">{closestRiver ? '0.3 km' : 'N/A'}</span></li>
                              <li>Terrain Slope: <span className="font-medium">2.5° (Moderate)</span></li>
                              <li>Historical Flood Patterns: <span className="font-medium">High correlation</span></li>
                            </ul>
                            <p className="mt-2">Model Confidence: <span className="font-medium">73%</span> (based on ML prediction)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
