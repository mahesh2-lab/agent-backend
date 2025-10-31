import { handleSingleFile } from "../services/evaluate.service.js";
import fs from "fs";
import path from "path";
import Queue from "bull";
import { fileURLToPath } from "url";
import { processEvaluationJob } from "../worker/evaluate.worker.js";
import { EventEmitter } from "events";

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
    const jobDescription =
      req.body.jobDescription.trim() || sampleJobDescription;

    if (!filePath || !jobDescription) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Enqueue evaluation job in background
    // await evaluateQueue.add({
    //   filePath: filePath.path,
    //   jobDescription,
    // });

    const data = await processEvaluationJob({
      data: { filePath: filePath.path, jobDescription },
    });

    res.status(200).json({
      success: true,
      message: "File uploaded successfully. Your resume is being processed.",
      data: data,
    });
  } catch (err) {
    console.error("something is wrong ", err.message);
    res.status(500).json({ error: err.message });
  }
};

// SSE + EventEmitter endpoint to process multiple uploaded files
export const uploadMultipleFiles = async (req, res) => {
  try {
    const files = req.files || [];
    const jobDescription = (
      req.body.jobDescription || sampleJobDescription
    ).trim();

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Setup SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    if (res.flushHeaders) res.flushHeaders();

    const emitter = new EventEmitter();

    const sendEvent = (event, payload) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (e) {
        // If client disconnected, stop further writes
        console.error("SSE write error", e && e.message);
      }
    };

    emitter.on("progress", (d) => sendEvent("progress", d));
    emitter.on("result", (d) => sendEvent("result", d));
    emitter.on("error", (d) => sendEvent("error", d));
    emitter.on("done", (d) => {
      sendEvent("done", d);
      // Close the stream after a short delay to ensure client receives final event
      try {
        res.write(`event: close\ndata: {}\n\n`);
      } catch (e) {}
      res.end();
    });

    // Process files sequentially to limit concurrency and memory usage
    (async () => {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const origName = f.originalname || path.basename(f.path || "");
        const jobId = `req-${Date.now()}-${i}`;

        emitter.emit("progress", {
          file: origName,
          index: i,
          status: "started",
        });

        try {
          const result = await processEvaluationJob({
            id: jobId,
            data: { filePath: f.path, jobDescription },
          });

          results.push({ file: origName, result });

          emitter.emit("result", {
            file: origName,
            index: i,
            status: "completed",
            result,
          });
        } catch (err) {
          console.error(
            `Error processing file ${origName}:`,
            err && err.message
          );
          emitter.emit("error", {
            file: origName,
            index: i,
            status: "failed",
            error: err && err.message,
          });
        }
      }

      emitter.emit("done", { count: results.length, results });
    })();
  } catch (err) {
    console.error("uploadMultipleFiles error:", err && err.message);
    // If SSE has already started, try to send an error event; otherwise fallback to JSON
    try {
      res.writeHead &&
        res.writeHead(500, { "Content-Type": "text/event-stream" });
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`
      );
      res.end();
    } catch (e) {
      return res.status(500).json({ error: err.message });
    }
  }
};
