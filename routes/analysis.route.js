import express from "express";
import {
  receiveInterviewAnalysis,
  getInterviewAnalysis,
} from "../controllers/analysis.controller.js";

const router = express.Router();

router.post("/process", receiveInterviewAnalysis); // Alias for /receive
router.get("/get/:room_name", getInterviewAnalysis);

export default router;
