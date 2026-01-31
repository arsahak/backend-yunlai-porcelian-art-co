import fs from "fs";

interface ImgBBResponse {
  success: boolean;
  data: {
    id: string;
    url: string;
    // ... other fields
  };
  error?: {
    message: string;
  };
}

/**
 * Uploads an image to ImgBB
 * @param filePath Path to the image file
 * @returns The URL of the uploaded image
 */
export const uploadToImgBB = async (filePath: string): Promise<string> => {
  const apiKey = process.env.IMAGEBB_API_KEY;

  if (!apiKey) {
    throw new Error("IMAGEBB_API_KEY is not defined in environment variables");
  }

  try {
    const fileStream = fs.readFileSync(filePath);
    const base64Image = fileStream.toString("base64");

    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("image", base64Image);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as ImgBBResponse;

    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || "Failed to upload to ImgBB");
    }
  } catch (error: any) {
    throw new Error(`ImgBB Upload Error: ${error.message}`);
  }
};