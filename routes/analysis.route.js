import express from "express";
import {
  receiveInterviewAnalysis,
  getInterviewAnalysis,
} from "../controllers/analysis.controller.js";

const router = express.Router();

router.post("/receive", receiveInterviewAnalysis);
router.get("/get/:room_name", getInterviewAnalysis);

export default router;
