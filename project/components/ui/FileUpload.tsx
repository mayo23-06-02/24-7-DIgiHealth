"use client";
import React, { useState, useRef } from "react";
import {
  BiCloudUpload,
  BiLink,
  BiTrash,
  BiCheckCircle,
  BiX,
  BiFileBlank,
} from "react-icons/bi";
import Button from "./Button";

interface FileUploadProps {
  label: string;
  description?: string;
  onFileSelect?: (file: File) => void;
  maxSizeMB?: number;
  accept?: string;
  value?: { name: string; size?: number; status: "uploading" | "completed" }[];
  onRemove?: (index: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  description = "Upload photos to add to this content",
  maxSizeMB = 100,
  accept = "JPEG, PNG, SVG and ZIP formats",
  value = [],
  onRemove,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Logic for file handling
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto p-6 mb-2.5 pb-5 bg-white animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1 mb-4">
          <h3 className=" font-semibold text-slate-800 tracking-tight font-grotesk">
            {label}
          </h3>
          <p className="text-xs text-slate-500 tracking-wide">{description}</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-slate-200 bg-slate-50/50 hover:border-primary/30 hover:bg-slate-50"
        }`}
      >
        <input type="file" className="hidden" ref={fileInputRef} />

        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center mb-2.5">
          <BiCloudUpload className="text-slate-500 text-3xl" />
        </div>

        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-slate-800">
            Drag & drop your files here or{" "}
            <span className="text-primary hover:underline transition-all">
              choose file
            </span>
          </p>
          <p className="text-xs font-semibold tracking-wide text-slate-500 ">
            {accept}, up to {maxSizeMB} MB.
          </p>
        </div>
      </div>

      {/* URL Upload */}
      <div className="space-y-3">
        <h1 className="flex items-center gap-2 text-xs font-bold text-slate-500 py-3 px-1">
          Or upload from URL <BiLink className="text-slate-300" />
        </h1>
        <div className="flex items-center gap-2 p-1.5 pl-5 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <div className="flex-none p-2.5 text-slate-500">
            <BiLink size={18} />
          </div>
          <input
            type="text"
            placeholder="Add file URL"
            className="flex-1 bg-transparent text-sm font-bold text-slate-700 placeholder-slate-300"
          />
          <Button variant="ghost" size="sm">
            Upload
          </Button>
        </div>
      </div>

      {/* File List */}
      {value.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-500  tracking-normal px-1 font-grotesk">
            Uploaded {label}
          </h4>
          <div className="space-y-3">
            {value.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 bg-white border-2 border-slate-50 rounded-lg hover:border-slate-100 transition-all group"
              >
                <div className="w-12 h-14 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0">
                  <BiFileBlank className="text-slate-200 text-2xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-800 truncate tracking-tight">
                      {file.name}
                    </p>
                    {onRemove && (
                      <button
                        onClick={() => onRemove(i)}
                        className="text-slate-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 px-1"
                      >
                        <BiTrash size={18} />
                      </button>
                    )}
                  </div>
                  {file.status === "uploading" ? (
                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full w-2/3 bg-primary rounded-lg animate-pulse"></div>
                      </div>
                      <p className="text-xs font-bold text-slate-500  tracking-normal">
                        102 KB of 32.5 MB • 4 sec left...
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300  tracking-normal">
                        24.1 MB •{" "}
                      </span>
                      <div className="flex items-center gap-1 text-green-500">
                        <BiCheckCircle size={14} />
                        <span className="text-xs font-bold  tracking-normal">
                          Completed
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {file.status === "uploading" && (
                  <button className="text-slate-300 hover:text-primary p-2">
                    <BiX size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
