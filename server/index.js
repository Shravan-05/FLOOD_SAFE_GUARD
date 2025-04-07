import express from "express";
import { setupVite, log, serveStatic } from "./vite";
import { registerRoutes } from "./routes";

async function main() {
  // Create the express app
  const app = express();
  
  // Middleware
  app.use(express.json());
  
  // Register API routes
  const httpServer = await registerRoutes(app);
  
  // Add vite or static middleware based on environment
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      log(`serving on port ${port}`);
    });
  } else {
    // Dev mode - let Vite handle server setup
    try {
      await setupVite(app, httpServer);
    } catch (error) {
      console.error("Error setting up Vite middleware:", error);
      process.exit(1);
    }
  }
  
  // Error handling middleware
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).send("Something went wrong");
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});