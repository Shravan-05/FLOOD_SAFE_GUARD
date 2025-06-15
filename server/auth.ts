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
import dotenv from 'dotenv';

dotenv.config();

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Helper functions
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

// Only send one email per login/signup per session
function shouldSendEmail(req: any, actionType: 'login' | 'signup') {
  if (!req.session.lastAlertType || req.session.lastAlertType !== actionType) {
    req.session.lastAlertType = actionType;
    return true;
  }
  return false;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "flood-guard-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
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
      }
      return done(null, user);
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Signup
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).send("Username already exists");
      }

      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).send("Email already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, async (err) => {
        if (err) return next(err);

        try {
          const userLocation = await storage.createLocation({
            userId: user.id,
            latitude: 12.9716,
            longitude: 77.5946,
            isHome: true,
          });

          const riskAssessment = await floodService.assessFloodRisk(
            userLocation.latitude,
            userLocation.longitude
          );

          await storage.createFloodRisk({
            userId: user.id,
            locationId: userLocation.id,
            riskLevel: riskAssessment.riskLevel,
            waterLevel: riskAssessment.waterLevel,
            thresholdLevel: riskAssessment.thresholdLevel,
          });

          const alertMessage = `Flood risk level: ${riskAssessment.riskLevel}. 
Current water level: ${riskAssessment.waterLevel}cm. 
Critical threshold: ${riskAssessment.thresholdLevel}cm.`;

          await storage.createAlert({
            userId: user.id,
            riskLevel: riskAssessment.riskLevel,
            message: alertMessage,
          });

          if (shouldSendEmail(req, 'signup')) {
            await emailService.sendFloodAlert(user.email, riskAssessment);
          }

        } catch (error) {
          console.error("Error sending signup flood alert:", error);
        }

        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login
  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      const user = req.user as SelectUser;

      let userLocations = await storage.getLocationsByUserId(user.id);
      let userLocation;

      if (userLocations.length === 0) {
        userLocation = await storage.createLocation({
          userId: user.id,
          latitude: 12.9716,
          longitude: 77.5946,
          isHome: true,
        });
      } else {
        userLocation = userLocations[0];
      }

      const riskAssessment = await floodService.assessFloodRisk(
        userLocation.latitude,
        userLocation.longitude
      );

      await storage.createFloodRisk({
        userId: user.id,
        locationId: userLocation.id,
        riskLevel: riskAssessment.riskLevel,
        waterLevel: riskAssessment.waterLevel,
        thresholdLevel: riskAssessment.thresholdLevel,
      });

      const alertMessage = `Flood risk level: ${riskAssessment.riskLevel}. 
Current water level: ${riskAssessment.waterLevel}cm. 
Critical threshold: ${riskAssessment.thresholdLevel}cm.`;

      await storage.createAlert({
        userId: user.id,
        riskLevel: riskAssessment.riskLevel,
        message: alertMessage,
      });

      if (shouldSendEmail(req, 'login')) {
        await emailService.sendFloodAlert(user.email, riskAssessment);
      }

      res.status(200).json(req.user);
    } catch (error) {
      console.error("Error during login process:", error);
      res.status(200).json(req.user); // Allow login even if email fails
    }
  });

  // Logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);

      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.sendStatus(200);
      });
    });
  });
}
