import { Router } from "express";
const router = Router();

import authMiddleware from "../middlewares/auth.js";
import validationMiddleware from "../middlewares/validation.js"; 
import registerCoach from "../../service/coaches.js";

router.post("/coaches", authMiddleware, validationMiddleware, registerCoach);

router.get("/me", (req, res) => {});

router.put("/coaches/me", (req, res) => {});

router.post("/coaches/me/submit-for-review", (req, res) => {});

export default router;

