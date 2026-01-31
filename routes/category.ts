import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controller/categoryController";
import { authenticate } from "../middleware/auth";
import { uploadSingle } from "../middleware/upload";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategory);

// Protected routes (authenticated users only)
router.post("/", authenticate, uploadSingle("image"), createCategory);
router.put("/:id", authenticate, uploadSingle("image"), updateCategory);
router.delete("/:id", authenticate, deleteCategory);

export default router;
