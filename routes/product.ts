import express from "express";
import {
    createProduct,
    deleteProduct,
    getCategories,
    getProduct,
    getProducts,
    updateProduct,
} from "../controller/productController";
import { authenticate } from "../middleware/auth";
import { uploadImage } from "../middleware/upload";

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProduct);

// Protected routes (authenticated users only)
router.post(
  "/",
  authenticate,
  uploadImage.any(), // Accept any file fields (for variants)
  createProduct
);

router.put(
  "/:id",
  authenticate,
  uploadImage.any(), // Accept any file fields (for variants)
  updateProduct
);

router.delete("/:id", authenticate, deleteProduct);

export default router;
