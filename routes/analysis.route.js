import express from "express";
import {
  receiveInterviewAnalysis,
  getInterviewAnalysis,
  getRecentAnalyses,
  getAllAnalyses
} from "../controllers/analysis.controller.js";

const router = express.Router();

router.post("/process", receiveInterviewAnalysis); // Alias for /receive
router.get("/get/:room_name", getInterviewAnalysis);
router.get("/recent", getRecentAnalyses);
router.get("/all", getAllAnalyses);

export default router;
