import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Header from '@/components/ui/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import RiskStatusBanner from '@/components/ui/risk-status-banner';
import LeafletMap from '@/components/ui/leaflet-map';
import { Button } from '@/components/ui/button';
import { getUserLocation, RISK_LEVELS } from '@/lib/floodUtils';
import { Loader2, MapPin, Navigation, AlertTriangle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Road } from '@shared/schema';

// Define FloodRisk type
type FloodRisk = {
  id?: number;
  riskLevel: string;
  waterLevel: number;
  thresholdLevel: number;
  timestamp?: string;
  userId?: number;
  latitude?: number;
  longitude?: number;
};

export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [alertSent, setAlertSent] = useState<boolean>(false);

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
  const { data: floodRisk, isLoading: isFloodRiskLoading } = useQuery<FloodRisk>({
    queryKey: ['/api/flood-risks/current'],
    enabled: !!userLocation,
  });

  // Fetch roads near user
  const { data: roads, isLoading: isRoadsLoading } = useQuery<Road[]>({
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

  // Send alert email mutation
  const sendAlertMutation = useMutation({
    mutationFn: async () => {
      // We're now only sending the location - the server will calculate the actual risk level
      const res = await apiRequest('POST', '/api/alerts/send-email', {
        userId: user?.id,
        userLocation  // Server will calculate risk level based on this location
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert Email Sent",
        description: "A flood risk alert has been sent to your email.",
        variant: "default"
      });
      setAlertSent(true);
    },
    onError: () => {
      toast({
        title: "Failed to Send Alert",
        description: "Could not send email alert. Please check your settings.",
        variant: "destructive"
      });
    }
  });

  // Send alert email when risk level is detected (only once)
  useEffect(() => {
    if (floodRisk && user?.email && !alertSent && (floodRisk.riskLevel === 'HIGH' || floodRisk.riskLevel === 'MEDIUM')) {
      sendAlertMutation.mutate();
    }
  }, [floodRisk, user?.email, alertSent, sendAlertMutation]);

  // Handle destination selection
  const handleDestinationSelect = (coords: { latitude: number; longitude: number }) => {
    setDestination(coords);
    
    toast({
      title: "Destination Selected",
      description: "Safe routes to your destination have been calculated.",
      variant: "default"
    });
  };

  // Count safe routes
  const safeRoutes = roads?.filter(road => road.status === 'SAFE') || [];

  const isLoading = isLocationLoading || isFloodRiskLoading || isRoadsLoading;

  // Default risk level if none available
  const defaultRiskLevel: FloodRisk = {
    riskLevel: RISK_LEVELS.LOW,
    waterLevel: 0,
    thresholdLevel: 0
  };

  // Use actual risk data or default
  const riskData = floodRisk || defaultRiskLevel;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Flood Risk Dashboard</h1>
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
                  riskLevel={riskData.riskLevel} 
                  waterLevel={riskData.waterLevel} 
                  thresholdLevel={riskData.thresholdLevel} 
                />

                {/* Risk Overview Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                  {/* Risk Level Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm font-medium text-gray-500">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Current Risk Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-semibold ${
                        riskData.riskLevel === 'HIGH' ? 'text-red-500' :
                        riskData.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-green-500'
                      }`}>
                        {riskData.riskLevel}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {riskData.riskLevel === 'HIGH' ? 
                          'Extreme caution required. Avoid travel if possible.' :
                          riskData.riskLevel === 'MEDIUM' ? 
                          'Be prepared for possible flooding in your area.' :
                          'No significant flooding risk at this time.'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Destination Status Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm font-medium text-gray-500">
                        <MapPin className="h-4 w-4 mr-2" />
                        Destination Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold text-gray-900">
                        {destination ? 'Selected' : 'Not Selected'}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {destination ? 
                          `Destination at ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : 
                          'Click on the map to select your destination'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Safe Routes Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm font-medium text-gray-500">
                        <Shield className="h-4 w-4 mr-2" />
                        Safe Routes Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-semibold text-gray-900">
                        {safeRoutes.length}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {safeRoutes.length > 0 ? 
                          'Safe routes available to your destination.' : 
                          'No safe routes found. Extreme caution advised.'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interactive Map with Destination Selection */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Interactive Flood Risk Map</h3>
                    <Badge 
                      variant={alertSent ? "outline" : "default"}
                      className={alertSent ? "bg-gray-100 text-gray-800" : ""}
                    >
                      {alertSent ? "Alert Email Sent" : "No Alert Sent"}
                    </Badge>
                  </div>
                  
                  {/* Leaflet Map Component */}
                  <LeafletMap 
                    userLocation={userLocation}
                    roads={roads || []}
                    riskLevel={riskData.riskLevel}
                    onDestinationSelect={handleDestinationSelect}
                  />
                  
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center text-sm">
                      <Navigation className="h-4 w-4 mr-2 text-primary" />
                      <span>
                        Click anywhere on the map to select your destination and view safe routes.
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Safe Route Suggestions */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-gray-900">Safe Route Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {safeRoutes.length > 0 ? (
                        <>
                          {safeRoutes.slice(0, 3).map((route, index) => (
                            <div key={route.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                route.status === 'OPEN' ? 'bg-green-100 text-green-600' : 
                                route.status === 'CAUTION' ? 'bg-amber-100 text-amber-600' : 
                                'bg-red-100 text-red-600'
                              }`}>
                                <Navigation className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium flex items-center justify-between">
                                  <span>{route.name}</span>
                                  <Badge 
                                    className={`ml-2 ${
                                      route.status === 'OPEN' ? 'bg-green-100 text-green-600 hover:bg-green-100' : 
                                      route.status === 'CAUTION' ? 'bg-amber-100 text-amber-600 hover:bg-amber-100' : 
                                      'bg-red-100 text-red-600 hover:bg-red-100'
                                    }`}
                                  >
                                    {route.status}
                                  </Badge>
                                </h4>
                                <p className="text-sm text-gray-600">{`Route ${index + 1} from your location to destination`}</p>
                                <div className="mt-1 text-xs text-gray-500 flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span>Distance: {(route.distance || 0).toFixed(1)} km</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-4 text-center bg-gray-50 rounded-lg">
                          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                          <h4 className="text-sm font-medium">No Safe Routes Available</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {destination 
                              ? "No safe routes were found to your destination due to high flood risk." 
                              : "Select a destination on the map to see available safe routes."}
                          </p>
                        </div>
                      )}
                      
                      {riskData.riskLevel === 'HIGH' && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertTitle className="font-medium">High Risk Warning</AlertTitle>
                          <AlertDescription>
                            Your area is experiencing a high flood risk. Travel is not advised. Consider seeking higher ground.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <Button 
                        className="w-full mt-2"
                        variant={alertSent ? "outline" : "default"}
                        disabled={alertSent || sendAlertMutation.isPending}
                        onClick={() => sendAlertMutation.mutate()}
                      >
                        {sendAlertMutation.isPending ? "Sending..." : alertSent ? "Alert Already Sent" : "Send Email Alert"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
