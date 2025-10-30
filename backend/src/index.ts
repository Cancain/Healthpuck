import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import dotenvSafe from "dotenv-safe";
import fs from "fs";
import path from "path";

import { initializeDatabase } from "./db";
import userRoutes from "./routes/users";

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

initializeDatabase();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Healthpack API is running" });
});

app.use("/api/users", userRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
