import { 
  users, type User, type InsertUser, 
  locations, type Location, type InsertLocation, 
  floodRisks, type FloodRisk, type InsertFloodRisk, 
  alerts, type Alert, type InsertAlert,
  roads, type Road, type InsertRoad, 
  riverLevels, type RiverLevel, type InsertRiverLevel 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc, and, sql } from 'drizzle-orm';
import postgres from 'postgres';
import connectPg from "connect-pg-simple";
import * as schema from "@shared/schema";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Location operations
  getLocation(id: number): Promise<Location | undefined>;
  getLocationsByUserId(userId: number): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  
  // Flood risk operations
  getFloodRisk(id: number): Promise<FloodRisk | undefined>;
  getFloodRisksByUserId(userId: number): Promise<FloodRisk[]>;
  getLatestFloodRiskByUserId(userId: number): Promise<FloodRisk | undefined>;
  createFloodRisk(risk: InsertFloodRisk): Promise<FloodRisk>;
  
  // Alert operations
  getAlert(id: number): Promise<Alert | undefined>;
  getAlertsByUserId(userId: number): Promise<Alert[]>;
  getUnreadAlertsByUserId(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<Alert | undefined>;
  
  // Road operations
  getRoad(id: number): Promise<Road | undefined>;
  getRoadsByArea(latitude: number, longitude: number, radius: number): Promise<Road[]>;
  createRoad(road: InsertRoad): Promise<Road>;
  updateRoadStatus(id: number, status: string): Promise<Road | undefined>;
  
  // River level operations
  getRiverLevel(id: number): Promise<RiverLevel | undefined>;
  getRiverLevelsByArea(latitude: number, longitude: number, radius: number): Promise<RiverLevel[]>;
  createRiverLevel(riverLevel: InsertRiverLevel): Promise<RiverLevel>;
  updateRiverLevel(id: number, level: number): Promise<RiverLevel | undefined>;
  
  // Session store
  sessionStore: any; // Using any for session store type
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private floodRisks: Map<number, FloodRisk>;
  private alerts: Map<number, Alert>;
  private roads: Map<number, Road>;
  private riverLevels: Map<number, RiverLevel>;
  sessionStore: any;
  
  private userIdCounter: number;
  private locationIdCounter: number;
  private floodRiskIdCounter: number;
  private alertIdCounter: number;
  private roadIdCounter: number;
  private riverLevelIdCounter: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.floodRisks = new Map();
    this.alerts = new Map();
    this.roads = new Map();
    this.riverLevels = new Map();
    
    this.userIdCounter = 1;
    this.locationIdCounter = 1;
    this.floodRiskIdCounter = 1;
    this.alertIdCounter = 1;
    this.roadIdCounter = 1;
    this.riverLevelIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with some sample river levels
    this.seedRiverLevels();
    // Initialize with some sample roads
    this.seedRoads();
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      firstName: insertUser.firstName || null, 
      lastName: insertUser.lastName || null, 
      receiveAlerts: insertUser.receiveAlerts ?? true
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }
  
  async getLocationsByUserId(userId: number): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(
      (location) => location.userId === userId
    );
  }
  
  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.locationIdCounter++;
    const now = new Date();
    const location: Location = { 
      ...insertLocation, 
      id, 
      lastUpdated: now,
      isHome: insertLocation.isHome ?? false
    };
    this.locations.set(id, location);
    return location;
  }
  
  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) return undefined;
    
    const now = new Date();
    const updatedLocation = { ...existingLocation, ...locationUpdate, lastUpdated: now };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }
  
  // Flood risk operations
  async getFloodRisk(id: number): Promise<FloodRisk | undefined> {
    return this.floodRisks.get(id);
  }
  
  async getFloodRisksByUserId(userId: number): Promise<FloodRisk[]> {
    return Array.from(this.floodRisks.values())
      .filter((risk) => risk.userId === userId)
      .sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }
  
  async getLatestFloodRiskByUserId(userId: number): Promise<FloodRisk | undefined> {
    const userRisks = await this.getFloodRisksByUserId(userId);
    return userRisks.length > 0 ? userRisks[0] : undefined;
  }
  
  async createFloodRisk(insertRisk: InsertFloodRisk): Promise<FloodRisk> {
    const id = this.floodRiskIdCounter++;
    const now = new Date();
    const floodRisk: FloodRisk = { 
      ...insertRisk, 
      id, 
      timestamp: now,
      waterLevel: insertRisk.waterLevel ?? null,
      thresholdLevel: insertRisk.thresholdLevel ?? null
    };
    this.floodRisks.set(id, floodRisk);
    return floodRisk;
  }
  
  // Alert operations
  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }
  
  async getAlertsByUserId(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.userId === userId)
      .sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async getUnreadAlertsByUserId(userId: number): Promise<Alert[]> {
    return (await this.getAlertsByUserId(userId)).filter(alert => !alert.isRead);
  }
  
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.alertIdCounter++;
    const now = new Date();
    const alert: Alert = { ...insertAlert, id, isRead: false, createdAt: now };
    this.alerts.set(id, alert);
    return alert;
  }
  
  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const existingAlert = this.alerts.get(id);
    if (!existingAlert) return undefined;
    
    const updatedAlert = { ...existingAlert, isRead: true };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }
  
  // Road operations
  async getRoad(id: number): Promise<Road | undefined> {
    return this.roads.get(id);
  }
  
  async getRoadsByArea(latitude: number, longitude: number, radius: number): Promise<Road[]> {
    // Simple implementation - in a real app would use haversine distance calculation
    return Array.from(this.roads.values())
      .filter(road => {
        const startLatDiff = Math.abs(road.startLat - latitude);
        const startLongDiff = Math.abs(road.startLong - longitude);
        const endLatDiff = Math.abs(road.endLat - latitude);
        const endLongDiff = Math.abs(road.endLong - longitude);
        
        // Simple check if either start or end point is within approx radius
        // (proper calculation would use haversine formula)
        return (startLatDiff < radius/111 && startLongDiff < radius/111) || 
               (endLatDiff < radius/111 && endLongDiff < radius/111);
      });
  }
  
  async createRoad(insertRoad: InsertRoad): Promise<Road> {
    const id = this.roadIdCounter++;
    const now = new Date();
    const road: Road = { 
      ...insertRoad, 
      id, 
      lastUpdated: now, 
      distance: insertRoad.distance ?? null 
    };
    this.roads.set(id, road);
    return road;
  }
  
  async updateRoadStatus(id: number, status: string): Promise<Road | undefined> {
    const existingRoad = this.roads.get(id);
    if (!existingRoad) return undefined;
    
    const now = new Date();
    const updatedRoad = { ...existingRoad, status, lastUpdated: now };
    this.roads.set(id, updatedRoad);
    return updatedRoad;
  }
  
  // River level operations
  async getRiverLevel(id: number): Promise<RiverLevel | undefined> {
    return this.riverLevels.get(id);
  }
  
  async getRiverLevelsByArea(latitude: number, longitude: number, radius: number): Promise<RiverLevel[]> {
    // Simple implementation - in a real app would use haversine distance calculation
    return Array.from(this.riverLevels.values())
      .filter(riverLevel => {
        const latDiff = Math.abs(riverLevel.latitude - latitude);
        const longDiff = Math.abs(riverLevel.longitude - longitude);
        
        // Simple check if point is within approx radius
        // (proper calculation would use haversine formula)
        return (latDiff < radius/111 && longDiff < radius/111);
      });
  }
  
  async createRiverLevel(insertRiverLevel: InsertRiverLevel): Promise<RiverLevel> {
    const id = this.riverLevelIdCounter++;
    const now = new Date();
    const riverLevel: RiverLevel = { 
      ...insertRiverLevel, 
      id, 
      timestamp: now,
      criticalThreshold: insertRiverLevel.criticalThreshold ?? null
    };
    this.riverLevels.set(id, riverLevel);
    return riverLevel;
  }
  
  async updateRiverLevel(id: number, level: number): Promise<RiverLevel | undefined> {
    const existingRiverLevel = this.riverLevels.get(id);
    if (!existingRiverLevel) return undefined;
    
    const now = new Date();
    const updatedRiverLevel = { ...existingRiverLevel, level, timestamp: now };
    this.riverLevels.set(id, updatedRiverLevel);
    return updatedRiverLevel;
  }
  
  // Seed data methods
  private seedRiverLevels() {
    const riverLevelsData: InsertRiverLevel[] = [
      { latitude: 17.385044, longitude: 78.486671, level: 85, criticalThreshold: 80 }, // Hyderabad
      { latitude: 18.520407, longitude: 73.856255, level: 95, criticalThreshold: 90 }, // Pune
      { latitude: 19.076090, longitude: 72.877426, level: 80, criticalThreshold: 75 }, // Mumbai
      { latitude: 12.971599, longitude: 77.594566, level: 75, criticalThreshold: 70 }  // Bangalore
    ];
    
    riverLevelsData.forEach(async (riverLevel) => {
      await this.createRiverLevel(riverLevel);
    });
  }
  
  private seedRoads() {
    const roadsData: InsertRoad[] = [
      { 
        name: 'A to B', 
        startLat: 17.385044, startLong: 78.486671, 
        endLat: 17.395044, endLong: 78.496671, 
        status: 'UNDER_FLOOD', 
        distance: 1.2
      },
      { 
        name: 'B to C', 
        startLat: 17.395044, startLong: 78.496671, 
        endLat: 17.405044, endLong: 78.506671, 
        status: 'SAFE', 
        distance: 0.8
      },
      { 
        name: 'A to C', 
        startLat: 17.385044, startLong: 78.486671, 
        endLat: 17.405044, endLong: 78.506671, 
        status: 'UNDER_FLOOD', 
        distance: 1.5
      }
    ];
    
    roadsData.forEach(async (road) => {
      await this.createRoad(road);
    });
  }
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  sessionStore: any;

  constructor() {
    // Create connection string from environment variables
    const connectionString = process.env.DATABASE_URL;
    const client = postgres(connectionString as string, { max: 10 });
    this.db = drizzle(client, { schema });
    
    // Setup session store with PostgreSQL
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
    
    // Initialize with sample data if needed
    this.init();
  }
  
  private async init() {
    try {
      // Check if we have river levels, if not seed them
      const riverLevelsList = await this.db.select().from(riverLevels);
      if (riverLevelsList.length === 0) {
        await this.seedRiverLevels();
      }
      
      // Check if we have roads, if not seed them
      const roadsList = await this.db.select().from(roads);
      if (roadsList.length === 0) {
        await this.seedRoads();
      }
      
      console.log('Database initialized successfully');
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
  
  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    const result = await this.db.select().from(locations).where(eq(locations.id, id)).limit(1);
    return result[0];
  }
  
  async getLocationsByUserId(userId: number): Promise<Location[]> {
    return await this.db.select().from(locations).where(eq(locations.userId, userId));
  }
  
  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await this.db.insert(locations).values(location).returning();
    return result[0];
  }
  
  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const now = new Date();
    const result = await this.db.update(locations)
      .set({ ...locationUpdate, lastUpdated: now })
      .where(eq(locations.id, id))
      .returning();
    return result[0];
  }
  
  // Flood risk operations
  async getFloodRisk(id: number): Promise<FloodRisk | undefined> {
    const result = await this.db.select().from(floodRisks).where(eq(floodRisks.id, id)).limit(1);
    return result[0];
  }
  
  async getFloodRisksByUserId(userId: number): Promise<FloodRisk[]> {
    return await this.db.select()
      .from(floodRisks)
      .where(eq(floodRisks.userId, userId))
      .orderBy(desc(floodRisks.timestamp));
  }
  
  async getLatestFloodRiskByUserId(userId: number): Promise<FloodRisk | undefined> {
    const results = await this.db.select()
      .from(floodRisks)
      .where(eq(floodRisks.userId, userId))
      .orderBy(desc(floodRisks.timestamp))
      .limit(1);
    return results[0];
  }
  
  async createFloodRisk(risk: InsertFloodRisk): Promise<FloodRisk> {
    const result = await this.db.insert(floodRisks).values(risk).returning();
    return result[0];
  }
  
  // Alert operations
  async getAlert(id: number): Promise<Alert | undefined> {
    const result = await this.db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return result[0];
  }
  
  async getAlertsByUserId(userId: number): Promise<Alert[]> {
    return await this.db.select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }
  
  async getUnreadAlertsByUserId(userId: number): Promise<Alert[]> {
    return await this.db.select()
      .from(alerts)
      .where(and(
        eq(alerts.userId, userId),
        eq(alerts.isRead, false)
      ))
      .orderBy(desc(alerts.createdAt));
  }
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await this.db.insert(alerts).values(alert).returning();
    return result[0];
  }
  
  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const result = await this.db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }
  
  // Road operations
  async getRoad(id: number): Promise<Road | undefined> {
    const result = await this.db.select().from(roads).where(eq(roads.id, id)).limit(1);
    return result[0];
  }
  
  async getRoadsByArea(latitude: number, longitude: number, radius: number): Promise<Road[]> {
    // This is a simplified implementation - in a real app we would use PostGIS
    // or a similar spatial extension for more accurate area queries
    const latRange = radius / 111; // Approx km to degree conversion
    const longRange = radius / (111 * Math.cos(latitude * (Math.PI / 180)));
    
    const allRoads = await this.db.select().from(roads);
    
    return allRoads.filter(road => {
      const startLatDiff = Math.abs(road.startLat - latitude);
      const startLongDiff = Math.abs(road.startLong - longitude);
      const endLatDiff = Math.abs(road.endLat - latitude);
      const endLongDiff = Math.abs(road.endLong - longitude);
      
      return (startLatDiff < latRange && startLongDiff < longRange) || 
             (endLatDiff < latRange && endLongDiff < longRange);
    });
  }
  
  async createRoad(road: InsertRoad): Promise<Road> {
    const result = await this.db.insert(roads).values(road).returning();
    return result[0];
  }
  
  async updateRoadStatus(id: number, status: string): Promise<Road | undefined> {
    const now = new Date();
    const result = await this.db.update(roads)
      .set({ status, lastUpdated: now })
      .where(eq(roads.id, id))
      .returning();
    return result[0];
  }
  
  // River level operations
  async getRiverLevel(id: number): Promise<RiverLevel | undefined> {
    const result = await this.db.select().from(riverLevels).where(eq(riverLevels.id, id)).limit(1);
    return result[0];
  }
  
  async getRiverLevelsByArea(latitude: number, longitude: number, radius: number): Promise<RiverLevel[]> {
    // This is a simplified implementation - in a real app we would use PostGIS
    // or a similar spatial extension for more accurate area queries
    const latRange = radius / 111; // Approx km to degree conversion
    const longRange = radius / (111 * Math.cos(latitude * (Math.PI / 180)));
    
    const allRiverLevels = await this.db.select().from(riverLevels);
    
    return allRiverLevels.filter(riverLevel => {
      const latDiff = Math.abs(riverLevel.latitude - latitude);
      const longDiff = Math.abs(riverLevel.longitude - longitude);
      
      return (latDiff < latRange && longDiff < longRange);
    });
  }
  
  async createRiverLevel(riverLevel: InsertRiverLevel): Promise<RiverLevel> {
    const result = await this.db.insert(riverLevels).values(riverLevel).returning();
    return result[0];
  }
  
  async updateRiverLevel(id: number, level: number): Promise<RiverLevel | undefined> {
    const now = new Date();
    const result = await this.db.update(riverLevels)
      .set({ level, timestamp: now })
      .where(eq(riverLevels.id, id))
      .returning();
    return result[0];
  }
  
  // Seed data methods
  private async seedRiverLevels() {
    const riverLevelsData: InsertRiverLevel[] = [
      { latitude: 17.385044, longitude: 78.486671, level: 85, criticalThreshold: 80 }, // Hyderabad
      { latitude: 18.520407, longitude: 73.856255, level: 95, criticalThreshold: 90 }, // Pune
      { latitude: 19.076090, longitude: 72.877426, level: 80, criticalThreshold: 75 }, // Mumbai
      { latitude: 12.971599, longitude: 77.594566, level: 75, criticalThreshold: 70 }  // Bangalore
    ];
    
    await this.db.insert(riverLevels).values(riverLevelsData);
    console.log('River levels seeded successfully');
  }
  
  private async seedRoads() {
    const roadsData: InsertRoad[] = [
      { 
        name: 'A to B', 
        startLat: 17.385044, startLong: 78.486671, 
        endLat: 17.395044, endLong: 78.496671, 
        status: 'UNDER_FLOOD', 
        distance: 1.2
      },
      { 
        name: 'B to C', 
        startLat: 17.395044, startLong: 78.496671, 
        endLat: 17.405044, endLong: 78.506671, 
        status: 'SAFE', 
        distance: 0.8
      },
      { 
        name: 'A to C', 
        startLat: 17.385044, startLong: 78.486671, 
        endLat: 17.405044, endLong: 78.506671, 
        status: 'UNDER_FLOOD', 
        distance: 1.5
      }
    ];
    
    await this.db.insert(roads).values(roadsData);
    console.log('Roads seeded successfully');
  }
}

// Use PostgresStorage instead of MemStorage
export const storage = new PostgresStorage();
