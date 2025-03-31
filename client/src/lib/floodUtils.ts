import { Road, RiverLevel } from "@shared/schema";

// Constants for risk assessment
export const RISK_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

export const ROAD_STATUS = {
  UNDER_FLOOD: 'UNDER_FLOOD',
  NEAR_FLOOD: 'NEAR_FLOOD',
  SAFE: 'SAFE'
};

/**
 * Get user's current geolocation
 * @returns Promise that resolves with the user's latitude and longitude
 */
export const getUserLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('User denied the request for Geolocation'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable'));
            break;
          case error.TIMEOUT:
            reject(new Error('The request to get user location timed out'));
            break;
          default:
            reject(new Error('An unknown error occurred'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Calculate the haversine distance between two coordinates
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371.0; // Earth's radius in kilometers
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Get the closest river level from a set of river data
 * @param userLat User's latitude
 * @param userLong User's longitude
 * @param riverLevels Array of river level data
 * @returns The closest river with distance information
 */
export const getClosestRiver = (
  userLat: number,
  userLong: number,
  riverLevels: RiverLevel[]
): { river: RiverLevel; distance: number } | null => {
  if (!riverLevels.length) return null;

  let closestRiver = riverLevels[0];
  let minDistance = haversineDistance(
    userLat,
    userLong,
    riverLevels[0].latitude,
    riverLevels[0].longitude
  );

  for (const river of riverLevels) {
    const distance = haversineDistance(
      userLat,
      userLong,
      river.latitude,
      river.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestRiver = river;
    }
  }

  return {
    river: closestRiver,
    distance: minDistance,
  };
};

/**
 * Assess flood risk level based on water level, threshold, and distance to river
 * @param waterLevel Current water level
 * @param criticalThreshold Threshold for critical water level
 * @param distanceToRiver Distance to the river in kilometers
 * @returns Risk level (HIGH, MEDIUM, LOW)
 */
export const assessFloodRiskLevel = (
  waterLevel: number,
  criticalThreshold: number | null,
  distanceToRiver: number
): string => {
  const threshold = criticalThreshold || 80; // Default threshold
  
  // Distance override: if user is more than 5km from any river, risk is always LOW
  // This matches the server-side distance override
  if (distanceToRiver > 5) {
    console.log(`Client forcing LOW risk due to large distance (${distanceToRiver}km) from river`);
    return RISK_LEVELS.LOW;
  }

  if (waterLevel >= threshold + 5) {
    return RISK_LEVELS.HIGH;
  } else if (waterLevel >= threshold) {
    return RISK_LEVELS.HIGH;
  } else if (waterLevel >= threshold - 5) {
    return RISK_LEVELS.MEDIUM;
  } else if (distanceToRiver < 0.5) {
    // Within 500m of river
    return RISK_LEVELS.MEDIUM;
  } else {
    return RISK_LEVELS.LOW;
  }
};

/**
 * Get safe routes from all available roads
 * @param roads Array of road data
 * @returns Only the safe roads
 */
export const getSafeRoutes = (roads: Road[]): Road[] => {
  return roads.filter((road) => road.status === ROAD_STATUS.SAFE);
};

/**
 * Get road status color based on status
 * @param status Road status
 * @returns CSS color class
 */
export const getRoadStatusColor = (status: string): string => {
  switch (status) {
    case ROAD_STATUS.UNDER_FLOOD:
      return 'bg-red-500';
    case ROAD_STATUS.NEAR_FLOOD:
      return 'bg-amber-500';
    case ROAD_STATUS.SAFE:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

/**
 * Get risk level color based on level
 * @param level Risk level
 * @returns CSS color class
 */
export const getRiskLevelColor = (level: string): string => {
  switch (level) {
    case RISK_LEVELS.HIGH:
      return 'text-red-500';
    case RISK_LEVELS.MEDIUM:
      return 'text-amber-500';
    case RISK_LEVELS.LOW:
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

/**
 * Get river name based on coordinates
 * @param latitude River latitude
 * @param longitude River longitude
 * @returns River name
 */
export const getRiverNameByCoordinates = (latitude: number, longitude: number): string => {
  // Simplified mapping based on coordinates
  const riverCoordinates: Record<string, string> = {
    "17.385044_78.486671": "Musi River", // Hyderabad
    "18.520407_73.856255": "Mula River", // Pune
    "19.076090_72.877426": "Mithi River", // Mumbai
    "12.971599_77.594566": "Vrishabhavathi River" // Bangalore
  };

  // Find the closest known river
  let minDistance = Infinity;
  let closestRiver = "Unknown River";

  for (const [coords, name] of Object.entries(riverCoordinates)) {
    const [riverLat, riverLong] = coords.split('_').map(Number);
    const distance = haversineDistance(latitude, longitude, riverLat, riverLong);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestRiver = name;
    }
  }

  return closestRiver;
};
