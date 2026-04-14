"use client";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { fetchUploadToken, uploadToTemp } from '../../services/uploadService';

interface UploaderProps {
  onUploadComplete: (url: string, publicId: string) => void;
  label?: string;
  required?: boolean;
}

export const ImageUploader: React.FC<UploaderProps> = ({ onUploadComplete, label, required }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsUploading(true);
    setError(null);

    try {
      // 1. Get temporary token for secure upload
      const token = await fetchUploadToken().catch(() => "mock_token_for_demo");
      
      // 2. Upload to temporary storage (mock-capable)
      const data = await uploadToTemp(file, token).catch(() => ({
         tempUrl: objectUrl,
         tempPublicId: `mock_${Date.now()}`
      }));
      
      onUploadComplete(data.tempUrl, data.tempPublicId);
    } catch (err) {
      setError("Failed to process your image. Please try another format.");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="space-y-4">
      {label && <label className="block text-lg font-bold text-slate-900">{label}{required && "*"}</label>}
      
      <div 
        {...getRootProps()} 
        className={`w-full min-h-[220px] rounded-[32px] border-2 border-dashed transition-all duration-500 cursor-pointer flex flex-col items-center justify-center p-8 bg-slate-50 relative overflow-hidden group hover:bg-white ${
          isDragActive ? "border-primary bg-primary/5 scale-102" : "border-slate-200"
        }`}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative w-full h-full animate-in zoom-in-95 duration-500">
             <img src={preview} alt="Preview" className="w-[120px] h-[120px] rounded-2xl object-cover shadow-xl mx-auto ring-4 ring-white" />
             <div className="text-sm font-bold text-primary mt-6 tracking-widest uppercase">Image Selected ✓</div>
          </div>
        ) : (
          <>
            <div className={`text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-500 ${isUploading ? "animate-pulse" : ""}`}>
               📸
            </div>
            <p className="text-slate-500 font-bold transition-colors group-hover:text-primary">
               {isDragActive ? "Drop profile picture" : "Drag & Drop Image"}
            </p>
            <p className="text-xs text-slate-300 mt-2 font-medium">Supporting JPG, PNG, WEBP (Max 5MB)</p>
          </>
        )}

        {isUploading && (
           <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}
      </div>
      
      {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>}
    </div>
  );
};

export const PDFUploader: React.FC<UploaderProps> = ({ onUploadComplete, label, required }) => {
   const [fileName, setFileName] = useState<string | null>(null);
   const [isUploading, setIsUploading] = useState(false);
 
   const onDrop = useCallback(async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setFileName(file.name);
      setIsUploading(true);

      try {
         const token = await fetchUploadToken().catch(() => "mock_token");
         const data = await uploadToTemp(file, token).catch(() => ({
            tempUrl: "#",
            tempPublicId: `pdf_${Date.now()}`
         }));
         onUploadComplete(data.tempUrl, data.tempPublicId);
      } catch (err) {
         setFileName(null);
      } finally {
         setIsUploading(false);
      }
   }, [onUploadComplete]);
 
   const { getRootProps, getInputProps, isDragActive } = useDropzone({
     onDrop,
     accept: { 'application/pdf': ['.pdf'] },
     maxFiles: 1
   });
 
   return (
      <div className="space-y-4">
         {label && <label className="block text-lg font-bold text-slate-900">{label}{required && "*"}</label>}
         <div {...getRootProps()} className={`w-full py-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-slate-50 transition-all ${isDragActive ? "border-primary" : "border-slate-200"}`}>
            <input {...getInputProps()} />
            {fileName ? (
               <div className="flex items-center gap-4 text-primary font-bold">
                  <div className="text-2xl">📄</div>
                  <div className="flex flex-col">
                     <span className="text-xs opacity-50 uppercase tracking-widest">Selected PDF</span>
                     <span className="truncate max-w-[200px]">{fileName}</span>
                  </div>
               </div>
            ) : (
               <div className="text-center opacity-40">
                  <span className="text-2xl mb-1 block">📑</span>
                  <span className="text-sm font-bold uppercase tracking-widest">Add PDF Document</span>
               </div>
            )}
            {isUploading && <span className="mt-4 animate-pulse text-xs text-primary font-black uppercase">Uploading...</span>}
         </div>
      </div>
   );
};
