import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan"; // Add morgan for logging

import tokenRoutes from "./routes/token.route.js";
import connectDB from "./db/connection.js";
import roomRoutes from "./routes/room.route.js";
import analysisRoutes from "./routes/analysis.route.js";
import resumeRoutes from "./routes/file.route.js";
import authRoutes from "./routes/auth.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev")); // Use morgan middleware for logging
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api", tokenRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on http://localhost:${PORT}`);
});
