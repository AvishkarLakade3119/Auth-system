import express from "express";
import { updateProfile, getProfile, getUserActivities } from "../controllers/profileController.js";
import { authenticateJWT, requireVerified } from "../middleware/auth.js";

const router = express.Router();

// Profile routes - all require authentication
router.get("/", authenticateJWT, requireVerified, getProfile);
router.post("/", authenticateJWT, requireVerified, updateProfile);
router.put("/", authenticateJWT, requireVerified, updateProfile);
router.get("/activities", authenticateJWT, requireVerified, getUserActivities);

export default router;