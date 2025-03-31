import { storage } from "../storage";

// Constants for risk assessment
const RISK_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

const ROAD_STATUS = {
  UNDER_FLOOD: 'UNDER_FLOOD',
  NEAR_FLOOD: 'NEAR_FLOOD',
  SAFE: 'SAFE'
};

// Haversine formula to calculate distance between two points
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0; // Earth radius in km
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;
  
  const dlat = lat2Rad - lat1Rad;
  const dlon = lon2Rad - lon1Rad;
  
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in km
}

// Random Forest model implementation (simplified version of the notebook classifier)
function predictFloodRisk(waterLevel: number, criticalThreshold: number, distanceToRiver: number): string {
  // Simple rule-based prediction based on notebook logic
  if (waterLevel >= criticalThreshold + 5) {
    return RISK_LEVELS.HIGH;
  } else if (waterLevel >= criticalThreshold) {
    return RISK_LEVELS.HIGH;
  } else if (waterLevel >= criticalThreshold - 5) {
    return RISK_LEVELS.MEDIUM;
  } else if (distanceToRiver < 0.5) { // Within 500m of river
    return RISK_LEVELS.MEDIUM;
  } else {
    return RISK_LEVELS.LOW;
  }
}

// Get the closest river level for a given location
async function getClosestRiverLevel(latitude: number, longitude: number) {
  const radius = 10; // 10 km radius
  const riverLevels = await storage.getRiverLevelsByArea(latitude, longitude, radius);
  
  if (riverLevels.length === 0) {
    return null;
  }
  
  let closestRiver = riverLevels[0];
  let minDistance = haversine(latitude, longitude, riverLevels[0].latitude, riverLevels[0].longitude);
  
  for (const river of riverLevels) {
    const distance = haversine(latitude, longitude, river.latitude, river.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      closestRiver = river;
    }
  }
  
  return {
    riverLevel: closestRiver,
    distance: minDistance
  };
}

class FloodService {
  // Assess flood risk for a given location
  async assessFloodRisk(latitude: number, longitude: number) {
    // Get the closest river
    const closestRiverData = await getClosestRiverLevel(latitude, longitude);
    
    if (!closestRiverData) {
      return {
        riskLevel: RISK_LEVELS.LOW,
        waterLevel: 0,
        thresholdLevel: 0,
        distance: null,
        riverName: null
      };
    }
    
    const { riverLevel, distance } = closestRiverData;
    
    // Predict flood risk
    const riskLevel = predictFloodRisk(
      riverLevel.level,
      riverLevel.criticalThreshold || riverLevel.level - 5, // Default critical threshold if not set
      distance
    );
    
    return {
      riskLevel,
      waterLevel: riverLevel.level,
      thresholdLevel: riverLevel.criticalThreshold,
      distance,
      riverName: this.getRiverNameByLocation(riverLevel.latitude, riverLevel.longitude)
    };
  }
  
  // Assess road status - implementing the road status classifier from the notebook
  async assessRoadStatus(startLat: number, startLong: number, endLat: number, endLong: number) {
    // Get river levels near road start and end points
    const radius = 5; // 5 km radius
    const riverLevelsStart = await storage.getRiverLevelsByArea(startLat, startLong, radius);
    const riverLevelsEnd = await storage.getRiverLevelsByArea(endLat, endLong, radius);
    
    // Combine river levels
    const allRiverLevels = [...riverLevelsStart, ...riverLevelsEnd];
    
    if (allRiverLevels.length === 0) {
      return ROAD_STATUS.SAFE;
    }
    
    // Check if any river level is close to the road (start or end point)
    for (const river of allRiverLevels) {
      const distanceToStart = haversine(startLat, startLong, river.latitude, river.longitude);
      const distanceToEnd = haversine(endLat, endLong, river.latitude, river.longitude);
      
      // Check if road is under flood (within 200 meters of a flooded area)
      if ((distanceToStart < 0.2 || distanceToEnd < 0.2) && 
          river.level > (river.criticalThreshold || 0)) {
        return ROAD_STATUS.UNDER_FLOOD;
      }
      
      // Check if road is near flood (within 500 meters of a flooded area)
      if ((distanceToStart < 0.5 || distanceToEnd < 0.5) && 
          river.level > (river.criticalThreshold || 0) - 5) {
        return ROAD_STATUS.NEAR_FLOOD;
      }
    }
    
    // If no flood indicators, the road is safe
    return ROAD_STATUS.SAFE;
  }
  
  // Get safe routes between two points
  async getSafeRoutes(startLat: number, startLong: number, endLat: number, endLong: number) {
    // Get all roads in the area
    const centerLat = (startLat + endLat) / 2;
    const centerLong = (startLong + endLong) / 2;
    const radius = haversine(startLat, startLong, endLat, endLong) * 1.5; // Buffer around route
    
    const allRoads = await storage.getRoadsByArea(centerLat, centerLong, radius);
    
    // Filter for safe roads
    const safeRoads = allRoads.filter(road => road.status !== ROAD_STATUS.UNDER_FLOOD);
    
    return {
      safeRoads,
      safeCount: safeRoads.length,
      totalRoads: allRoads.length
    };
  }
  
  // Helper methods
  getRiverNameByLocation(latitude: number, longitude: number) {
    // Simplified - would use a database of river names in a real app
    const riverCoordinates = {
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
      const distance = haversine(latitude, longitude, riverLat, riverLong);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestRiver = name;
      }
    }
    
    return closestRiver;
  }
}

export const floodService = new FloodService();
