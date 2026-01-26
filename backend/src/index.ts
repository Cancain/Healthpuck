import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import dotenv from "dotenv";
import dotenvSafe from "dotenv-safe";
import fs from "fs";
import path from "path";

import "./auth/passportWhoop";
import { initializeDatabase } from "./db";
import userRoutes from "./routes/users";
import authRoutes from "./routes/auth";
import patientRoutes from "./routes/patients";
import medicationRoutes from "./routes/medications";
import checkInRoutes from "./routes/checkIns";
import whoopIntegrationRoutes from "./routes/integrations/whoop";
import alertRoutes from "./routes/alerts";
import heartRateRoutes from "./routes/heartRate";
import notificationRoutes from "./routes/notifications";
import { startAlertScheduler } from "./utils/alertScheduler";
import { setupWebSocketServer } from "./websocket/server";
import { initializeFirebase } from "./utils/notificationService";

// Prefer dotenv-safe when an example file exists to validate required env vars.
// Fallback to plain dotenv if the example file is not present.
const examplePath = path.resolve(process.cwd(), ".env.example");
if (fs.existsSync(examplePath)) {
  dotenvSafe.config();
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const allowedOrigins = CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        console.warn(`CORS: Rejected origin "${origin}". Allowed origins:`, allowedOrigins);
        // Return false instead of error to properly reject without causing 500
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Healthpuck API is running" });
});

// Debug endpoint to check CORS configuration (remove in production if needed)
app.get("/health/cors", (req: Request, res: Response) => {
  res.json({
    allowedOrigins,
    currentOrigin: req.headers.origin || "none",
    isAllowed: req.headers.origin ? allowedOrigins.includes(req.headers.origin) : false,
  });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/check-ins", checkInRoutes);
app.use("/api/integrations/whoop", whoopIntegrationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/heart-rate", heartRateRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  try {
    await initializeDatabase();
    initializeFirebase();
    const server = http.createServer(app);
    setupWebSocketServer(server);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
      console.log(`Server accessible at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
    startAlertScheduler();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
