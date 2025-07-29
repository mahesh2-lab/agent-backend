import express from "express";
import { createToken, verifyToken } from "../controllers/token.controller.js";

const router = express.Router();

router.post("/token", createToken);
router.post("/verify-token", verifyToken);

export default router;
