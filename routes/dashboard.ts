import express from "express";
import { getDashboardStats } from "../controller/dashboardController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Protected route to get dashboard statistics
router.get("/stats", authenticate, getDashboardStats);

export default router;
