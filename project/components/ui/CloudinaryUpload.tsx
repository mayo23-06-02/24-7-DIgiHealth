"use client";
import React, { useState, useRef } from "react";
import {
  BiCloudUpload,
  BiCheckCircle,
  BiX,
  BiFileBlank,
  BiLoaderAlt,
} from "react-icons/bi";

interface CloudinaryUploadProps {
  label: string;
  description?: string;
  onUploadComplete: (url: string) => void;
  accept?: string;
  value?: string; // The URL of the uploaded file
}

const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({
  label,
  description = "Upload photos, PDFs or certificates",
  onUploadComplete,
  accept = "image/*,application/pdf",
  value,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "emf-preset",
    );

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dmvgc1ktj"}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onUploadComplete(data.secure_url);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-800 font-grotesk">
          {label}
        </h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
          uploading
            ? "border-primary bg-primary/5 cursor-not-allowed"
            : value
              ? "border-green-200 bg-green-50"
              : "border-slate-200 bg-slate-50 hover:border-primary/30"
        }`}
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <BiLoaderAlt className="text-primary text-3xl animate-spin" />
            <p className="text-sm font-bold text-primary">Uploading...</p>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <BiCheckCircle size={24} />
            </div>
            <p className="text-sm font-bold text-green-700 truncate max-w-xs">
              File Uploaded Successfully
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUploadComplete("");
              }}
              className="text-xs text-slate-500 hover:text-red-500 underline"
            >
              Remove and try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <BiCloudUpload className="text-slate-500 text-3xl" />
            <p className="text-sm font-bold text-slate-600">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-slate-500">PDF, PNG, JPG (max 10MB)</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
};

export default CloudinaryUpload;
