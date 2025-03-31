import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Road } from '@shared/schema';

type RoadStatusProps = {
  roads: Road[];
  compact?: boolean;
};

export default function RoadStatus({ roads, compact = false }: RoadStatusProps) {
  return (
    <div className="p-4">
      <div className="space-y-4">
        {roads.map((road) => (
          <div key={road.id} className="border rounded-md overflow-hidden">
            <div className={`px-4 py-2 text-white font-medium flex justify-between items-center ${
              road.status === 'UNDER_FLOOD' ? 'bg-red-500' :
              road.status === 'NEAR_FLOOD' ? 'bg-amber-500' : 'bg-green-500'
            }`}>
              <span>{road.name}</span>
              <span className="text-sm font-normal">{road.distance} km</span>
            </div>
            <div className="px-4 py-3 bg-white">
              <div className="flex items-center">
                {road.status === 'SAFE' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="ml-2 text-sm text-gray-600">
                  {road.status === 'UNDER_FLOOD' ? 'Under Flood - Avoid this route' :
                   road.status === 'NEAR_FLOOD' ? 'Near Flood - Use caution' : 'Safe - Recommended route'}
                </span>
              </div>
              {!compact && (
                <div className="mt-2">
                  <div className="flex text-xs text-gray-500">
                    <span>From: ({road.startLat.toFixed(4)}, {road.startLong.toFixed(4)})</span>
                    <span className="mx-1">→</span>
                    <span>To: ({road.endLat.toFixed(4)}, {road.endLong.toFixed(4)})</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!compact && (
        <div className="mt-4">
          <Button 
            className="w-full"
            variant="default"
          >
            Get Directions to Safe Area
          </Button>
        </div>
      )}
    </div>
  );
}
