import { handleSingleFile } from "../services/evaluate.service.js";
import fs from "fs";
import path from "path";
import Queue from "bull";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const evaluateQueue = new Queue("evaluate", {
  redis: { port: 6379, host: "127.0.0.1" },
});

export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const jobDescription = fs.readFileSync(
      path.join(__dirname, "../utils/JOB_DESCRIPTION.txt"),
      "utf8"
    );

    // Respond to client immediately
    res.redirect("/success.html");

    // Enqueue evaluation job in background
    await evaluateQueue.add({
      filePath: req.file.path,
      jobDescription,
    });
  } catch (err) {
    console.error("something is wrong ", err.message);
    res.status(500).json({ error: err.message });
  }
};
