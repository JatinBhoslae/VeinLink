import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Ensure environment variables are loaded (safe even if already loaded)
dotenv.config();

// Configure Cloudinary - Try different common variable name patterns
console.log("Checking Cloudinary environment variables...");

// Try different possible variable names
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET;

console.log("Cloud name:", cloudName ? "SET" : "NOT SET");
console.log("API Key:", apiKey ? "SET" : "NOT SET");
console.log("API Secret:", apiSecret ? "SET" : "NOT SET");

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Determine best Cloudinary resource_type based on MIME type
function resolveResourceType(mimeType) {
  if (!mimeType) return "auto";
  if (mimeType.startsWith("image/")) return "image";
  // Treat documents and PDFs as raw assets
  const rawMimes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
  return rawMimes.has(mimeType) ? "raw" : "auto";
}

const uploadOnCloudinary = async (localFilePath, mimeType) => {
  try {
    if (!localFilePath) return null;

    // Use absolute path to avoid cwd issues
    const absolutePath = path.isAbsolute(localFilePath)
      ? localFilePath
      : path.resolve(process.cwd(), localFilePath);

    const resource_type = resolveResourceType(mimeType);

    // Upload file on cloudinary
    const response = await cloudinary.uploader.upload(absolutePath, {
      resource_type,
      use_filename: true,
      unique_filename: true,
    });

    // File has been uploaded successfully
    console.log("File uploaded to cloudinary:", response.secure_url || response.url);

    // Remove the local file
    try {
      fs.unlinkSync(absolutePath);
    } catch (e) {
      console.warn("Failed to delete local upload temp file:", e.message);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error?.message || error);

    // Remove the local file even if upload failed
    try {
      const p = path.isAbsolute(localFilePath) ? localFilePath : path.resolve(process.cwd(), localFilePath);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch (e) {
      console.warn("Cleanup local file failed:", e.message);
    }

    return null;
  }
};

const deleteOnCloudinary = async (public_id, resource_type = "image") => {
  try {
    if (!public_id) return null;

    // Delete file from cloudinary
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: `${resource_type}`,
    });

    console.log("Cloudinary delete result:", result);
    return result;
  } catch (error) {
    console.log("Delete on cloudinary failed", error);
    return error;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
