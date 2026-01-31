import express from "express";
import {
    createBlog,
    deleteBlog,
    getBlog,
    getBlogs,
    getCategories,
    updateBlog,
} from "../controller/blogController";
import { authenticate } from "../middleware/auth";
import { uploadSingle } from "../middleware/upload";

const router = express.Router();

// Public routes
router.get("/", getBlogs);
router.get("/categories", getCategories);
router.get("/:id", getBlog);

// Protected routes (authenticated users only)
router.post(
  "/",
  authenticate,
  uploadSingle("featuredImage"),
  createBlog
);

router.put(
  "/:id",
  authenticate,
  uploadSingle("featuredImage"),
  updateBlog
);

router.delete("/:id", authenticate, deleteBlog);

export default router;
