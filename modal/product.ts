import mongoose, { Document, Schema } from "mongoose";

// Product Color Variant Interface
export interface IColorVariant {
  color: string; // e.g., "Red", "Blue", "White"
  colorCode?: string; // Hex code e.g., "#FF0000"
  images: string[]; // Array of image URLs for this color
}

// Product Size Variant Interface
export interface ISizeVariant {
  size: string; // e.g., "Small", "Medium", "Large"
  price: number; // Price for this size
  stock: number; // Stock for this specific size
  sku?: string; // Unique SKU for this size variant
}

// Product Image Interface
export interface IProductImage {
  url: string;
  alt?: string;
  isPrimary: boolean;
}

// Product Interface
export interface IProduct extends Document {
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number; // Original price for showing discounts
  costPrice?: number; // Cost price for profit calculations
  sku: string;
  barcode?: string;
  category?: string; // Simple category name (e.g. "Vases", "Plates")
  subCategory?: string;
  brand?: string;
  tags: string[];
  images: IProductImage[];
  colorVariants?: IColorVariant[];
  sizeVariants?: ISizeVariant[];

  // Inventory
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;

  // Dimensions & Shipping
  weight?: number; // in kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  slug: string;

  // Status & Visibility
  status: "active" | "draft" | "archived";
  featured: boolean;
  badges: ("featured" | "best-seller" | "new-arrival" | "offer" | "trending")[];

  // Ratings
  averageRating: number;
  totalReviews: number;

  // Sales tracking
  totalSales: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const colorVariantSchema = new Schema({
  color: { type: String, required: true },
  colorCode: { type: String },
  images: [{ type: String}],
});

const sizeVariantSchema = new Schema({
  size: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  sku: { type: String },
});

const productImageSchema = new Schema({
  url: { type: String, required: true },
  alt: { type: String },
  isPrimary: { type: Boolean, default: false },
});

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Compare at price cannot be negative"],
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    tags: [{ type: String, trim: true }],
    images: [productImageSchema],
    colorVariants: [colorVariantSchema],
    sizeVariants: [sizeVariantSchema],

    // Inventory
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },

    // Dimensions & Shipping
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },

    // SEO
    metaTitle: {
      type: String,
      maxlength: [70, "Meta title cannot exceed 70 characters"],
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Status & Visibility
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "draft",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    badges: {
      type: [String],
      enum: ["featured", "best-seller", "new-arrival", "offer", "trending"],
      default: [],
    },

    // Ratings
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot exceed 5"],
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    // Sales tracking
    totalSales: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ status: 1, featured: 1 });
productSchema.index({ badges: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug if not provided
productSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(
      ((this.compareAtPrice - this.price) / this.compareAtPrice) * 100
    );
  }
  return 0;
});

// Virtual for profit margin
productSchema.virtual("profitMargin").get(function () {
  if (this.costPrice && this.price > this.costPrice) {
    return Math.round(((this.price - this.costPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for low stock status
productSchema.virtual("isLowStock").get(function () {
  return this.trackInventory && this.stock <= this.lowStockThreshold;
});

// Virtual for out of stock status
productSchema.virtual("isOutOfStock").get(function () {
  return this.trackInventory && this.stock === 0 && !this.allowBackorder;
});

// Ensure virtuals are included in JSON
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

const Product =
  mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);

export default Product;
