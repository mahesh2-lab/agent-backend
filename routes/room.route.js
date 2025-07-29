import express from "express";
import { getRoomData } from "../controllers/room.controler.js";

const router = express.Router();

router.get("/:roomName", getRoomData);

export default router;
