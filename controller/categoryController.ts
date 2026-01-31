import { Response } from "express";
import fs from "fs";
import { AuthRequest } from "../middleware/auth";
import Category from "../modal/category";
import Product from "../modal/product";
import { uploadToImgBB } from "../utils/uploadToImgBB";

// Get all categories with pagination and filters
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const categories = await Category.find(query)
      .populate("createdBy", "name email")
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.title,
          status: "active",
        });
        return {
          ...category.toObject(),
          productCount,
        };
      })
    );

    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      data: categoriesWithCount,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

// Get single category by ID or slug
export const getCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const category = await Category.findOne(query).populate(
      "createdBy",
      "name email"
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({
      category: category.title,
      status: "active",
    });

    return res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
};

// Create new category
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    console.log("Create Category Request Body:", req.body);
    console.log("Create Category Request File:", req.file);

    let imageUrl = "";

    // Upload category image if provided
    if (req.file) {
      try {
        console.log(`Uploading category image: ${req.file.path}`);
        imageUrl = await uploadToImgBB(req.file.path);
        console.log(`Uploaded successfully: ${imageUrl}`);
        fs.unlinkSync(req.file.path);
      } catch (uploadError: any) {
        console.error("Image upload failed:", uploadError);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
    }

    const categoryData: any = {
      ...req.body,
      image: imageUrl,
      createdBy: req.user?.userId,
    };

    // Generate slug if not present
    if (!categoryData.slug && categoryData.title) {
      categoryData.slug = categoryData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    console.log("Saving category data:", categoryData);
    const category = await Category.create(categoryData);
    console.log("Category saved:", category._id);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error: any) {
    console.error("Error creating category:", error);

    // Cleanup file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

// Update category
export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldCategory = await Category.findById(id);

    if (!oldCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    let imageUrl = oldCategory.image;

    // Upload new image if provided
    if (req.file) {
      try {
        imageUrl = await uploadToImgBB(req.file.path);
        fs.unlinkSync(req.file.path);
      } catch (uploadError: any) {
        console.error("Image upload failed:", uploadError);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }
    }

    const updateData: any = { ...req.body, image: imageUrl };

    // Update slug if title changed
    if (updateData.title && updateData.title !== oldCategory.title) {
      updateData.slug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error("Error updating category:", error);

    // Cleanup file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

// Delete category
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if any products use this category
    const categoryToDelete = await Category.findById(id);
    if (!categoryToDelete) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productsUsingCategory = await Product.countDocuments({
      category: categoryToDelete.title,
    });

    if (productsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${productsUsingCategory} product(s) are using this category.`,
      });
    }

    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};
