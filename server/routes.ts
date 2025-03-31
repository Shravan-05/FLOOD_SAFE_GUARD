import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { floodService } from "./api/floodService";
import { emailService } from "./api/emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // User location routes
  app.post("/api/locations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { latitude, longitude, isHome } = req.body;
      const userId = req.user?.id;
      
      if (!userId || !latitude || !longitude) {
        return res.status(400).send("Missing required fields");
      }
      
      const location = await storage.createLocation({
        userId,
        latitude,
        longitude,
        isHome: isHome || false
      });
      
      res.status(201).json(location);
      
      // Assess flood risk for this location
      const riskAssessment = await floodService.assessFloodRisk(latitude, longitude);
      
      // Save the risk assessment
      const floodRisk = await storage.createFloodRisk({
        userId,
        locationId: location.id,
        riskLevel: riskAssessment.riskLevel,
        waterLevel: riskAssessment.waterLevel,
        thresholdLevel: riskAssessment.thresholdLevel
      });
      
      // Create alert if risk is medium or high
      if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'MEDIUM') {
        const alert = await storage.createAlert({
          userId,
          riskLevel: riskAssessment.riskLevel,
          message: `Flood risk in your area is ${riskAssessment.riskLevel}. Current water level: ${riskAssessment.waterLevel}m (threshold: ${riskAssessment.thresholdLevel}m)`
        });
        
        // Send email alert if user has opted in
        if (req.user?.receiveAlerts) {
          emailService.sendFloodAlert(req.user.email, riskAssessment);
        }
      }
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/locations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      
      const locations = await storage.getLocationsByUserId(userId);
      res.json(locations);
    } catch (error) {
      next(error);
    }
  });
  
  // Flood risk routes
  app.get("/api/flood-risks/current", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      
      const latestRisk = await storage.getLatestFloodRiskByUserId(userId);
      if (!latestRisk) {
        return res.status(404).send("No flood risk data available");
      }
      
      res.json(latestRisk);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/flood-risks/history", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      
      const risks = await storage.getFloodRisksByUserId(userId);
      res.json(risks);
    } catch (error) {
      next(error);
    }
  });
  
  // Road status routes
  app.get("/api/roads", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude || !radius) {
        return res.status(400).send("Missing required parameters");
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      
      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        return res.status(400).send("Invalid parameters");
      }
      
      const roads = await storage.getRoadsByArea(lat, lng, rad);
      res.json(roads);
      
      // Update road statuses based on latest flood data
      await Promise.all(
        roads.map(async (road) => {
          const status = await floodService.assessRoadStatus(
            road.startLat, road.startLong, road.endLat, road.endLong
          );
          
          if (status !== road.status) {
            await storage.updateRoadStatus(road.id, status);
          }
        })
      );
    } catch (error) {
      next(error);
    }
  });
  
  // Alert routes
  app.get("/api/alerts", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      
      const alerts = await storage.getAlertsByUserId(userId);
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/alerts/:id/read", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { id } = req.params;
      const alertId = parseInt(id);
      
      if (isNaN(alertId)) {
        return res.status(400).send("Invalid alert ID");
      }
      
      const alert = await storage.getAlert(alertId);
      if (!alert) {
        return res.status(404).send("Alert not found");
      }
      
      if (alert.userId !== req.user?.id) {
        return res.status(403).send("Not authorized to access this alert");
      }
      
      const updatedAlert = await storage.markAlertAsRead(alertId);
      res.json(updatedAlert);
    } catch (error) {
      next(error);
    }
  });
  
  // River level routes
  app.get("/api/river-levels", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude || !radius) {
        return res.status(400).send("Missing required parameters");
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      
      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        return res.status(400).send("Invalid parameters");
      }
      
      const riverLevels = await storage.getRiverLevelsByArea(lat, lng, rad);
      res.json(riverLevels);
    } catch (error) {
      next(error);
    }
  });
  
  // User settings routes
  app.patch("/api/settings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = req.user?.id;
      if (!userId) return res.sendStatus(401);
      
      const { receiveAlerts, firstName, lastName, email } = req.body;
      
      // Update user settings
      const updatedUser = await storage.updateUser(userId, {
        receiveAlerts, firstName, lastName, email
      });
      
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
