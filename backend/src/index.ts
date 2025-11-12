import express, { Request, Response, NextFunction } from "express";
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
import whoopIntegrationRoutes from "./routes/integrations/whoop";

// Prefer dotenv-safe when an example file exists to validate required env vars.
// Fallback to plain dotenv if the example file is not present.
const examplePath = path.resolve(process.cwd(), ".env.example");
if (fs.existsSync(examplePath)) {
  dotenvSafe.config();
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const allowedOrigins = CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, false);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        console.warn(`CORS: Rejected origin "${origin}". Allowed origins:`, allowedOrigins);
        callback(new Error("Not allowed by CORS"));
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
  res.json({ status: "ok", message: "Healthpack API is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/integrations/whoop", whoopIntegrationRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
