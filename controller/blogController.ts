import { Response } from "express";
import fs from "fs";
import { AuthRequest } from "../middleware/auth";
import Blog from "../modal/blog";
import { uploadToImgBB } from "../utils/uploadToImgBB";

// Get all blogs with pagination and filters
export const getBlogs = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      featured,
      category,
    } = req.query;

    const query: any = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by category
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    // Filter by featured
    if (featured !== undefined) {
      query.featured = featured === "true";
    }

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { body: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search as string, "i")] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const blogs = await Blog.find(query)
      .populate("createdBy", "name email")
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs",
      error: error.message,
    });
  }
};

// Get single blog by ID or slug
export const getBlog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const blog = await Blog.findOne(query).populate("createdBy", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error: any) {
    console.error("Error fetching blog:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching blog",
      error: error.message,
    });
  }
};

// Create new blog
export const createBlog = async (req: AuthRequest, res: Response) => {
  try {
    console.log("Create Blog Request Body:", req.body);
    console.log("Create Blog Request File:", req.file);

    let featuredImage = "";

    // Upload featured image if provided
    if (req.file) {
      try {
        console.log(`Uploading featured image: ${req.file.path}`);
        featuredImage = await uploadToImgBB(req.file.path);
        console.log(`Uploaded successfully: ${featuredImage}`);
        fs.unlinkSync(req.file.path);
      } catch (uploadError: any) {
        console.error("Image upload failed:", uploadError);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
    }

    const blogData: any = {
      ...req.body,
      featuredImage,
      createdBy: req.user?.userId,
    };

    // Generate slug if not present
    if (!blogData.slug && blogData.title) {
      blogData.slug = blogData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    // Parse tags if it's a string
    if (typeof blogData.tags === "string") {
      blogData.tags = blogData.tags.split(",").map((tag: string) => tag.trim());
    }

    // Parse boolean fields
    if (blogData.featured !== undefined) {
      blogData.featured =
        blogData.featured === "true" || blogData.featured === true;
    }

    // Set publishedAt if status is published
    if (blogData.status === "published" && !blogData.publishedAt) {
      blogData.publishedAt = new Date();
    }

    console.log("Saving blog data:", blogData);
    const blog = await Blog.create(blogData);
    console.log("Blog saved:", blog._id);

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error: any) {
    console.error("Error creating blog:", error);

    // Cleanup file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error creating blog",
      error: error.message,
    });
  }
};

// Update blog
export const updateBlog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldBlog = await Blog.findById(id);

    if (!oldBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    let featuredImage = oldBlog.featuredImage;

    // Upload new featured image if provided
    if (req.file) {
      try {
        featuredImage = await uploadToImgBB(req.file.path);
        fs.unlinkSync(req.file.path);
      } catch (uploadError: any) {
        console.error("Image upload failed:", uploadError);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }
    }

    const updateData: any = { ...req.body, featuredImage };

    // Parse tags if it's a string
    if (typeof updateData.tags === "string") {
      updateData.tags = updateData.tags.split(",").map((tag: string) => tag.trim());
    }

    // Parse boolean fields
    if (updateData.featured !== undefined) {
      updateData.featured =
        updateData.featured === "true" || updateData.featured === true;
    }

    // Update publishedAt if status changed to published
    if (
      updateData.status === "published" &&
      oldBlog.status !== "published" &&
      !updateData.publishedAt
    ) {
      updateData.publishedAt = new Date();
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error: any) {
    console.error("Error updating blog:", error);

    // Cleanup file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error updating blog",
      error: error.message,
    });
  }
};

// Delete blog
export const deleteBlog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting blog",
      error: error.message,
    });
  }
};

// Get unique categories
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Blog.distinct("category");
    // Filter out empty or null categories and sort alphabetically
    const cleanCategories = categories
      .filter((c) => c && c.trim() !== "")
      .sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      data: cleanCategories,
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
