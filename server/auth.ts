import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { emailService } from "./api/emailService";
import { floodService } from "./api/floodService";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "flood-guard-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).send("Username already exists");
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).send("Email already exists");
      }

      // Create the new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Log the user in
      req.login(user, async (err) => {
        if (err) return next(err);
        
        try {
          // Create default location
          const userLocation = await storage.createLocation({
            userId: user.id,
            latitude: 12.9716,
            longitude: 77.5946,
            isHome: true
          });
          
          // Assess flood risk for this location
          const riskAssessment = await floodService.assessFloodRisk(
            userLocation.latitude,
            userLocation.longitude
          );
          
          // Store the risk assessment
          const floodRisk = await storage.createFloodRisk({
            userId: user.id,
            locationId: userLocation.id,
            riskLevel: riskAssessment.riskLevel,
            waterLevel: riskAssessment.waterLevel,
            thresholdLevel: riskAssessment.thresholdLevel
          });
          
          // Create an alert
          const alertMessage = `Flood risk level: ${riskAssessment.riskLevel}. 
            Current water level: ${riskAssessment.waterLevel}cm. 
            Critical threshold: ${riskAssessment.thresholdLevel}cm.`;
            
          await storage.createAlert({
            userId: user.id,
            riskLevel: riskAssessment.riskLevel,
            message: alertMessage
          });
          
          // Send email alert 
          await emailService.sendFloodAlert(user.email, riskAssessment);
        } catch (error) {
          console.error("Error sending welcome alert:", error);
        }
        
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      const user = req.user as SelectUser;
      
      // Always send alerts on login
      // Get or create a default location for the user if it doesn't exist
      let userLocations = await storage.getLocationsByUserId(user.id);
      let userLocation;
      
      if (userLocations.length === 0) {
        // Use default location (Bangalore)
        userLocation = await storage.createLocation({
          userId: user.id,
          latitude: 12.9716,
          longitude: 77.5946,
          isHome: true
        });
      } else {
        // Use first location
        userLocation = userLocations[0];
      }
      
      // Assess flood risk for this location
      const riskAssessment = await floodService.assessFloodRisk(
        userLocation.latitude, 
        userLocation.longitude
      );
      
      // Store the risk assessment
      const floodRisk = await storage.createFloodRisk({
        userId: user.id,
        locationId: userLocation.id,
        riskLevel: riskAssessment.riskLevel,
        waterLevel: riskAssessment.waterLevel,
        thresholdLevel: riskAssessment.thresholdLevel
      });
      
      // Create an alert
      const alertMessage = `Flood risk level: ${riskAssessment.riskLevel}. 
        Current water level: ${riskAssessment.waterLevel}cm. 
        Critical threshold: ${riskAssessment.thresholdLevel}cm.`;
        
      await storage.createAlert({
        userId: user.id,
        riskLevel: riskAssessment.riskLevel,
        message: alertMessage
      });
      
      // Always send email alert regardless of risk level
      await emailService.sendFloodAlert(user.email, riskAssessment);
      
      // Return user data
      res.status(200).json(req.user);
    } catch (error) {
      console.error("Error during login process:", error);
      // Still return success since login worked
      res.status(200).json(req.user);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
