import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/ui/header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, BellRing, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AlertsPage() {
  const { toast } = useToast();
  
  // Fetch alerts
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['/api/alerts'],
  });
  
  // Mark alert as read
  const markAsRead = async (alertId) => {
    try {
      await apiRequest('POST', `/api/alerts/${alertId}/read`);
      
      // Invalidate the alerts query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      
      toast({
        title: "Alert marked as read",
        description: "This alert has been marked as read.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not mark alert as read.",
        variant: "destructive",
      });
    }
  };
  
  // Filter alerts
  const [filter, setFilter] = useState('ALL');
  
  const filteredAlerts = alerts?.filter(alert => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !alert.isRead;
    return alert.riskLevel === filter;
  });
  
  // Count unread and by risk level
  const unreadCount = alerts?.filter(a => !a.isRead).length || 0;
  const highCount = alerts?.filter(a => a.riskLevel === 'HIGH').length || 0;
  const mediumCount = alerts?.filter(a => a.riskLevel === 'MEDIUM').length || 0;
  const lowCount = alerts?.filter(a => a.riskLevel === 'LOW').length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Flood Alerts</h1>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
            {/* Filters */}
            <div className="bg-white shadow p-4 rounded-lg mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Filter:</span>
                <Button 
                  variant={filter === 'ALL' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('ALL')}
                >
                  All
                </Button>
                <Button 
                  variant={filter === 'UNREAD' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('UNREAD')}
                >
                  Unread <Badge className="ml-1" variant="secondary">{unreadCount}</Badge>
                </Button>
                <Button 
                  variant={filter === 'HIGH' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('HIGH')}
                  className={filter === 'HIGH' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  High Risk <Badge className="ml-1" variant="secondary">{highCount}</Badge>
                </Button>
                <Button 
                  variant={filter === 'MEDIUM' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('MEDIUM')}
                  className={filter === 'MEDIUM' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  Medium Risk <Badge className="ml-1" variant="secondary">{mediumCount}</Badge>
                </Button>
                <Button 
                  variant={filter === 'LOW' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilter('LOW')}
                  className={filter === 'LOW' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  Low Risk <Badge className="ml-1" variant="secondary">{lowCount}</Badge>
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading alerts...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load alerts. Please try again later.
                </AlertDescription>
              </Alert>
            ) : filteredAlerts?.length === 0 ? (
              <div className="text-center bg-white shadow rounded-lg p-8">
                <BellRing className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No alerts</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'ALL' 
                    ? "You don't have any flood alerts yet."
                    : `No ${filter.toLowerCase()} alerts found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts?.map((alert) => (
                  <Card key={alert.id} className={!alert.isRead ? 'border-l-4 border-l-blue-500' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            <Badge className={`mr-2 ${
                              alert.riskLevel === 'HIGH' ? 'bg-red-500' :
                              alert.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'
                            }`}>
                              {alert.riskLevel}
                            </Badge>
                            Flood Risk Alert
                          </CardTitle>
                          <CardDescription>
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </CardDescription>
                        </div>
                        {!alert.isRead && (
                          <Badge variant="outline" className="text-blue-500 border-blue-500">New</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>{alert.message}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-0">
                      <Button variant="outline" size="sm">View on Map</Button>
                      {!alert.isRead && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="flex items-center gap-1"
                          onClick={() => markAsRead(alert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark as Read
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}