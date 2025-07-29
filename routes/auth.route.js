import { Router } from "express";
import { checkPassword, getdata} from "../controllers/auth.controller.js";

const router = Router();

router.post("/check-password", checkPassword);
router.get("/get-data/:id", getdata);


export default router;
