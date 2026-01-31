import mongoose, { Document, Schema } from "mongoose";

// Blog Interface
export interface IBlog extends Document {
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  author: string;
  category?: string;
  tags: string[];
  featuredImage?: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  
  // SEO Meta Tags
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Blog Schema
const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    body: {
      type: String,
      required: [true, "Body content is required"],
    },
    excerpt: {
      type: String,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    featuredImage: {
      type: String,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    
    // SEO Meta Tags
    metaTitle: {
      type: String,
      maxlength: [60, "Meta title should not exceed 60 characters"],
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description should not exceed 160 characters"],
    },
    metaKeywords: {
      type: String,
    },
    
    publishedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
blogSchema.index({ title: "text", body: "text", tags: "text" });
blogSchema.index({ status: 1, publishedAt: -1 });

const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;
