import { Response } from "express";
import fs from "fs";
import { AuthRequest } from "../middleware/auth";
import Category from "../modal/category";
import Product from "../modal/product";
import { processProductImagesToWebP } from "../utils/imageProcessor";
import { uploadToImgBB } from "../utils/uploadToImgBB";

// Get all products with pagination and filters
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      featured,
      minPrice,
      maxPrice,
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

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search as string, "i")] } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find(query)
      .populate("createdBy", "name email")
      .sort(sort)
      .limit(Number(limit))
      .skip(skip);

    const total = await Product.countDocuments(query);

    // Convert product images to WebP format
    const productsWithWebP = await Promise.all(
      products.map(async (product) => {
        const productObj = product.toObject();
        if (productObj.images && productObj.images.length > 0) {
          productObj.images = await processProductImagesToWebP(
            productObj.images,
            85
          );
        }
        return productObj;
      })
    );

    res.status(200).json({
      success: true,
      data: productsWithWebP,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// Get single product by ID or slug
export const getProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const product = await Product.findOne(query)
      .populate("createdBy", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Convert product images to WebP format
    const productObj = product.toObject();
    if (productObj.images && productObj.images.length > 0) {
      productObj.images = await processProductImagesToWebP(
        productObj.images,
        85
      );
    }

    return res.status(200).json({
      success: true,
      data: productObj,
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// Create new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    console.log("Create Product Request Body:", req.body);
    console.log("Create Product Request Files:", req.files);

    const files = req.files as Express.Multer.File[];
    const images: any[] = [];

    // Separate main product images from variant images
    const mainImages = files?.filter(file => file.fieldname === 'images') || [];
    
    // Upload main product images to ImgBB
    if (mainImages.length > 0) {
      for (const file of mainImages) {
        try {
          console.log(`Uploading file: ${file.path}`);
          const imageUrl = await uploadToImgBB(file.path);
          console.log(`Uploaded successfully: ${imageUrl}`);
          images.push({
            url: imageUrl,
            isPrimary: images.length === 0,
          });
          fs.unlinkSync(file.path);
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
      }
    }

    const productData: any = {
      ...req.body,
      images,
      createdBy: req.user?.userId,
    };

    // Handle color variants
    if (req.body.colorVariants) {
      try {
        const colorVariants = JSON.parse(req.body.colorVariants);
        const processedColorVariants = [];

        for (let i = 0; i < colorVariants.length; i++) {
          const variant = colorVariants[i];
          const variantImages: string[] = [];

          // Get files for this color variant
          const variantFiles = files?.filter(
            file => file.fieldname === `colorVariant_${i}_images`
          ) || [];

          // Upload color variant images
          for (const file of variantFiles) {
            try {
              const imageUrl = await uploadToImgBB(file.path);
              variantImages.push(imageUrl);
              fs.unlinkSync(file.path);
            } catch (uploadError: any) {
              console.error("Color variant image upload failed:", uploadError);
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
          }

          processedColorVariants.push({
            color: variant.color,
            colorCode: variant.colorCode,
            images: variantImages,
          });
        }

        productData.colorVariants = processedColorVariants;
      } catch (error) {
        console.error("Error parsing color variants:", error);
      }
    }

    // Handle size variants
    if (req.body.sizeVariants) {
      try {
        productData.sizeVariants = JSON.parse(req.body.sizeVariants);
      } catch (error) {
        console.error("Error parsing size variants:", error);
      }
    }

    // Generate slug if not present
    if (!productData.slug && productData.name) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    // Parse numeric/boolean fields
    if (productData.price) productData.price = Number(productData.price);
    if (productData.compareAtPrice)
      productData.compareAtPrice = Number(productData.compareAtPrice);
    if (productData.stock) productData.stock = Number(productData.stock);
    if (productData.featured)
      productData.featured =
        productData.featured === "true" || productData.featured === true;

    // Parse badges array
    if (productData.badges) {
      try {
        productData.badges = JSON.parse(productData.badges);
      } catch (error) {
        console.error("Error parsing badges:", error);
        productData.badges = [];
      }
    }

    console.log("Saving product data:", productData);
    const product = await Product.create(productData);
    console.log("Product saved:", product._id);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("Error creating product:", error);
    
    // Cleanup files
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach((file) => {
        try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) { console.error("Error deleting file:", e); }
      });
    }

    // Handle duplicate SKU error
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: `Product with SKU "${error.keyValue.sku}" already exists. Please use a unique SKU.`,
        error: "Duplicate SKU",
      });
    }

    // Handle other duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const value = error.keyValue?.[field] || 'value';
      return res.status(400).json({
        success: false,
        message: `A product with this ${field} "${value}" already exists.`,
        error: "Duplicate entry",
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

// Update product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldProduct = await Product.findById(id);

    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const files = req.files as Express.Multer.File[];
    let newImages: any[] = [];

    // Separate main images from variant images
    const mainImages = files?.filter(file => file.fieldname === 'images') || [];

    // Upload new main images to ImgBB
    if (mainImages.length > 0) {
      for (const file of mainImages) {
        try {
          const imageUrl = await uploadToImgBB(file.path);
          newImages.push({
            url: imageUrl,
            isPrimary: false,
          });
          fs.unlinkSync(file.path);
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
      }
    }

    const updateData: any = { ...req.body };

    // Handle kept images from keptImages array
    let keptImages: any[] = [];
    if (req.body.keptImages) {
      const keptUrls = Array.isArray(req.body.keptImages)
        ? req.body.keptImages
        : [req.body.keptImages];

      keptImages = oldProduct.images
        .filter((img: any) => keptUrls.includes(img.url))
        .map((img: any) => ({
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary,
        }));
    }

    // Combine kept images with new images
    updateData.images = [...keptImages, ...newImages];

    // Ensure at least one image is primary
    if (
      updateData.images.length > 0 &&
      !updateData.images.some((img: any) => img.isPrimary)
    ) {
      updateData.images[0].isPrimary = true;
    }

    // Handle color variants
    if (req.body.colorVariants) {
      try {
        const colorVariants = JSON.parse(req.body.colorVariants);
        const processedColorVariants = [];

        for (let i = 0; i < colorVariants.length; i++) {
          const variant = colorVariants[i];
          
          // Start with existing images
          let variantImages: string[] = variant.images || [];

          // Get new files for this color variant
          const variantFiles = files?.filter(
            file => file.fieldname === `colorVariant_${i}_images`
          ) || [];

          // Upload new color variant images
          for (const file of variantFiles) {
            try {
              const imageUrl = await uploadToImgBB(file.path);
              variantImages.push(imageUrl);
              fs.unlinkSync(file.path);
            } catch (uploadError: any) {
              console.error("Color variant image upload failed:", uploadError);
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
          }

          processedColorVariants.push({
            color: variant.color,
            colorCode: variant.colorCode,
            images: variantImages,
          });
        }

        updateData.colorVariants = processedColorVariants;
      } catch (error) {
        console.error("Error parsing color variants:", error);
      }
    }

    // Handle size variants
    if (req.body.sizeVariants) {
      try {
        updateData.sizeVariants = JSON.parse(req.body.sizeVariants);
      } catch (error) {
        console.error("Error parsing size variants:", error);
      }
    }

    // Parse numeric/boolean fields
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.compareAtPrice)
      updateData.compareAtPrice = Number(updateData.compareAtPrice);
    if (updateData.stock) updateData.stock = Number(updateData.stock);
    if (updateData.featured !== undefined)
      updateData.featured =
        updateData.featured === "true" || updateData.featured === true;

    // Parse badges array
    if (updateData.badges) {
      try {
        updateData.badges = JSON.parse(updateData.badges);
      } catch (error) {
        console.error("Error parsing badges:", error);
        updateData.badges = [];
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error("Error updating product:", error);

    // Cleanup files
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach((file) => {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {
          console.error("Error deleting file:", e);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// Delete product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// Get categories from Category model with product counts
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    // Fetch active categories from Category collection
    const categories = await Category.find({ status: "active" })
      .select("title slug description image")
      .sort({ title: 1 });

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.title,
          status: "active",
        });
        return {
          _id: category._id,
          title: category.title,
          slug: category.slug,
          description: category.description,
          image: category.image,
          productCount,
        };
      })
    );

    // Also include any categories from products that don't exist in Category collection
    const productCategories = await Product.distinct("category");
    const existingCategoryTitles = categories.map(c => c.title);
    
    const orphanCategories = productCategories
      .filter((c) => c && c.trim() !== "" && !existingCategoryTitles.includes(c))
      .map((title) => ({
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        productCount: 0, // Will be calculated below
        isOrphan: true, // Flag to indicate it's not in Category collection
      }));

    // Get product counts for orphan categories
    const orphanCategoriesWithCount = await Promise.all(
      orphanCategories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.title,
          status: "active",
        });
        return {
          ...category,
          productCount,
        };
      })
    );

    // Combine and sort all categories
    const allCategories = [...categoriesWithCount, ...orphanCategoriesWithCount]
      .sort((a, b) => a.title.localeCompare(b.title));

    res.status(200).json({
      success: true,
      data: allCategories,
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