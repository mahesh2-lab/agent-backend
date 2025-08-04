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
const sampleJobDescription = fs.readFileSync(
  path.join(__dirname, "../utils/JOB_DESCRIPTION.txt"),
  "utf8"
);
export const uploadSingleFile = async (req, res) => {
  try {
    const filePath = req.file;
    const jobDescription = req.body.jobDescription.trim() || sampleJobDescription;

    if (!filePath || !jobDescription) {
      return res.status(400).json({ error: "No file uploaded" });
    }


    // Enqueue evaluation job in background
    await evaluateQueue.add({
      filePath: filePath.path,
      jobDescription,
    });

    res.status(200).json({
      success: true,
      message: "File uploaded successfully. Your resume is being processed.",
    });
  } catch (err) {
    console.error("something is wrong ", err.message);
    res.status(500).json({ error: err.message });
  }
};
