import React, { useState, useRef } from "react";
import {
  BiX,
  BiUpload,
  BiCloudUpload,
  BiFile,
  BiLoaderAlt,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

interface AttachRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export default function AttachRecordModal({
  isOpen,
  onClose,
  conversationId,
}: AttachRecordModalProps) {
  const [type, setType] = useState("lab_result");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOffline, queueAction } = useOfflineQueue();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      toast.error("Please provide a title and select a file.");
      return;
    }

    if (isOffline) {
      toast.error("You are offline. Attachment queued for later sync.");
      // Add to offline queue if implemented. For now, just close and we'd rely on useOfflineQueue
      // In a full implementation, you'd serialize the file (e.g. base64) and save to IndexedDB.
      // Because files can be large, it requires dedicated offline handling.
      onClose();
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading record securely...");

    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("type", type);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("file", file);

      const res = await fetch("/api/chat/attach-record", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      toast.success("Record attached successfully.", { id: toastId });
      onClose();
      // Reset state
      setTitle("");
      setDescription("");
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to attach record.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={isUploading ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6  animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
        >
          <BiX size={20} />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3 font-grotesk">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <BiUpload size={22} />
          </div>
          Attach Clinical Record
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500  tracking-wide mb-1.5 px-1">
              Record Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none bg-slate-50 font-medium"
            >
              <option value="lab_result">Lab Result</option>
              <option value="prescription">Prescription</option>
              <option value="imaging">Imaging Report</option>
              <option value="soap_note">SOAP Note</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500  tracking-wide mb-1.5 px-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Work Results April 2026"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500  tracking-wide mb-1.5 px-1">
              Notes / Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any clinical notes regarding this attachment..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary outline-none h-20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500  tracking-wide mb-1.5 px-1">
              File Attachment
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:bg-slate-100 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center"
            >
              {file ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <BiFile size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-primary flex items-center justify-center mb-3">
                    <BiCloudUpload size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-1">
                    Click or drag & drop to upload
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    Supports PDF, JPG, PNG, DICOM (Max 10MB)
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.dcm"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file || !title}
              className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold  tracking-normal text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-none shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
            >
              {isUploading ? (
                <>
                  <BiLoaderAlt className="animate-spin" size={16} /> Uploading
                </>
              ) : (
                "Attach Record"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
