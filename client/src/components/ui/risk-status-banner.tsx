import { AlertTriangle, Info } from 'lucide-react';

type RiskStatusBannerProps = {
  riskLevel: string;
  waterLevel: number;
  thresholdLevel: number;
};

export default function RiskStatusBanner({
  riskLevel,
  waterLevel,
  thresholdLevel
}: RiskStatusBannerProps) {
  // Set background color based on risk level
  let bgColor, Icon;
  switch (riskLevel) {
    case 'HIGH':
      bgColor = 'bg-red-500';
      Icon = AlertTriangle;
      break;
    case 'MEDIUM':
      bgColor = 'bg-amber-500';
      Icon = AlertTriangle;
      break;
    default:
      bgColor = 'bg-red-500';
      Icon = Info;
  }

  return (
    <div className={`my-4 p-4 rounded-md ${bgColor} text-white shadow-md`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium">Flood Risk: {riskLevel} {riskLevel === 'HIGH' ? '🚨' : riskLevel === 'MEDIUM' ? '⚠️' : '🚨'}</h3>
          <div className="mt-2 text-sm">
            Current river level: {waterLevel} meters {thresholdLevel ? `(critical threshold: ${thresholdLevel} meters)` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
