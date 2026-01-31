import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Blog from "../modal/blog";
import Product from "../modal/product";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Run queries in parallel for better performance
    const [
      totalProducts,
      activeProducts,
      draftProducts,
      archivedProducts,
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      archivedBlogs,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ status: "draft" }),
      Product.countDocuments({ status: "archived" }),
      Blog.countDocuments(),
      Blog.countDocuments({ status: "published" }),
      Blog.countDocuments({ status: "draft" }),
      Blog.countDocuments({ status: "archived" }),
    ]);

    // Prepare data for charts
    const productStats = {
      total: totalProducts,
      byStatus: {
        active: activeProducts,
        draft: draftProducts,
        archived: archivedProducts,
      },
      chartData: [
        { name: "Active", value: activeProducts, color: "#22c55e" }, // Green
        { name: "Draft", value: draftProducts, color: "#eab308" },   // Yellow
        { name: "Archived", value: archivedProducts, color: "#ef4444" }, // Red
      ],
    };

    const blogStats = {
      total: totalBlogs,
      byStatus: {
        published: publishedBlogs,
        draft: draftBlogs,
        archived: archivedBlogs,
      },
      chartData: [
        { name: "Published", value: publishedBlogs, color: "#3b82f6" }, // Blue
        { name: "Draft", value: draftBlogs, color: "#eab308" },       // Yellow
        { name: "Archived", value: archivedBlogs, color: "#ef4444" },  // Red
      ],
    };

    res.status(200).json({
      success: true,
      data: {
        products: productStats,
        blogs: blogStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};
