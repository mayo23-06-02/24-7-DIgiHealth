"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BiFile,
  BiUpload,
  BiLoaderAlt,
  BiImage,
  BiEditAlt,
  BiTrash,
  BiCheckCircle,
  BiX,
  BiDownload,
  BiCloudUpload,
  BiImages,
  BiErrorCircle,
  BiNote,
  BiCheck,
} from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface UserDocument {
  id: string;
  type: string;
  url: string;
  mimeType: string;
  status: string;
  createdAt: string;
  note?: string;
}

interface UploadQueueItem {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface DocumentsTabProps {
  documents: UserDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<UserDocument[]>>;
  isUploadingDoc: boolean;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  handleDocUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFilesUpload: (
    files: FileList | File[],
    kind?: "photo" | "document" | "auto",
  ) => void | Promise<void>;
  handleDeleteDoc: (id: string) => void;
  handleRenameDoc: (id: string) => void;
  editDocId: string | null;
  setEditDocId: (id: string | null) => void;
  editDocLabel: string;
  setEditDocLabel: (label: string) => void;
  uploadError?: string | null;
  uploadQueue?: UploadQueueItem[];
  onDismissUploadItem?: (id: string) => void;
  handleUpdateDocNote?: (id: string, note: string) => void | Promise<void>;
}

const ACCEPT_ALL =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPT_PHOTOS = "image/jpeg,image/png,image/webp,image/gif";
const ACCEPT_DOCS =
  "application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,image/gif";

export default function DocumentsTab({
  documents,
  isUploadingDoc,
  docInputRef,
  handleDocUpload,
  handleFilesUpload,
  handleDeleteDoc,
  handleRenameDoc,
  editDocId,
  setEditDocId,
  editDocLabel,
  setEditDocLabel,
  uploadError,
  uploadQueue = [],
  onDismissUploadItem,
  handleUpdateDocNote,
}: DocumentsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(0.9);
  const [dragOver, setDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const localDocInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function getViewUrl(doc: UserDocument): string {
    const isPdf =
      doc.mimeType?.includes("pdf") || doc.url?.toLowerCase().endsWith(".pdf");
    if (!isPdf) return doc.url;
    if (doc.url?.includes("firebasestorage.googleapis.com")) return doc.url;
    if (doc.url?.startsWith("/api/media/")) return doc.url;
    return `/api/user/documents/proxy?url=${encodeURIComponent(doc.url)}`;
  }

  const isImage = (doc: UserDocument) =>
    !!doc.mimeType?.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif)$/i.test(doc.url || "");

  const saveNote = (id: string) => {
    handleUpdateDocNote?.(id, noteDraft);
    setNoteEditingId(null);
  };

  const NoteBlock = ({ doc }: { doc: UserDocument }) => {
    if (!handleUpdateDocNote) return null;
    if (noteEditingId === doc.id) {
      return (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            autoFocus
            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none"
            placeholder="Add a note about this file..."
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveNote(doc.id)}
          />
          <button
            type="button"
            onClick={() => saveNote(doc.id)}
            className="p-1.5 bg-emerald-500 text-white rounded-lg shrink-0"
          >
            <BiCheck size={14} />
          </button>
          <button
            type="button"
            onClick={() => setNoteEditingId(null)}
            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg shrink-0"
          >
            <BiX size={14} />
          </button>
        </div>
      );
    }
    return doc.note ? (
      <button
        type="button"
        onClick={() => {
          setNoteEditingId(doc.id);
          setNoteDraft(doc.note || "");
        }}
        className="mt-1.5 flex items-start gap-1 text-left w-full group/note"
      >
        <BiNote size={12} className="text-slate-400 mt-0.5 shrink-0" />
        <span className="text-[11px] text-slate-500 group-hover/note:text-primary transition-colors">
          {doc.note}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => {
          setNoteEditingId(doc.id);
          setNoteDraft("");
        }}
        className="mt-1.5 text-[11px] font-semibold text-primary/70 hover:text-primary"
      >
        + Add note
      </button>
    );
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (isUploadingDoc) return;
      const files = e.dataTransfer.files;
      if (files?.length) void handleFilesUpload(files, "auto");
    },
    [handleFilesUpload, isUploadingDoc],
  );

  const photos = documents.filter(isImage);
  const otherDocs = documents.filter((d) => !isImage(d));

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Hidden inputs */}
      <input
        ref={docInputRef}
        type="file"
        accept={ACCEPT_ALL}
        multiple
        className="hidden"
        onChange={handleDocUpload}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept={ACCEPT_PHOTOS}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          console.log("[DocumentsTab] Photo input changed, files:", files, "length:", files?.length);
          if (files && files.length > 0) {
            console.log("[DocumentsTab] Calling handleFilesUpload for photos");
            void handleFilesUpload(files, "photo");
          }
          // Clear after processing
          e.target.value = "";
        }}
      />
      <input
        ref={localDocInputRef}
        type="file"
        accept={ACCEPT_DOCS}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          console.log("[DocumentsTab] Document input changed, files:", files, "length:", files?.length);
          if (files && files.length > 0) {
            console.log("[DocumentsTab] Calling handleFilesUpload for documents");
            void handleFilesUpload(files, "document");
          }
          // Clear after processing
          e.target.value = "";
        }}
      />

      {/* Upload zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed transition-all ${
          uploadError ? "border-rose-300 bg-rose-50/50" :
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-slate-200 bg-white"
        } shadow-sm shadow-slate-200/40 overflow-hidden`}
      >
        <div className="px-5 sm:px-7 py-6 sm:py-8">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                dragOver
                  ? "bg-primary text-white"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isUploadingDoc ? (
                <BiLoaderAlt size={28} className="animate-spin" />
              ) : (
                <BiCloudUpload size={28} />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-grotesk">
              {isUploadingDoc
                ? "Uploading…"
                : uploadError
                  ? "Upload unavailable"
                  : dragOver
                    ? "Drop files to upload"
                    : "Upload photos & documents"}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              {uploadError
                ? uploadError
                : "Drag and drop files here, or choose a type below. Photos: JPG, PNG, WebP, GIF (max 10MB). Documents: PDF or Word (max 15MB)."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <Button
                type="button"
                onClick={() => {
                  console.log("[DocumentsTab] Upload photos button clicked, ref:", photoInputRef.current);
                  photoInputRef.current?.click();
                }}
                disabled={isUploadingDoc || !!uploadError}
                className="!rounded-xl !h-11 !px-5 !max-w-none normal-case !tracking-normal"
                icon={<BiImages size={18} />}
                iconPosition="left"
              >
                Upload photos
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log("[DocumentsTab] Upload documents button clicked, ref:", localDocInputRef.current);
                  localDocInputRef.current?.click();
                }}
                disabled={isUploadingDoc || !!uploadError}
                className="!rounded-xl !h-11 !px-5 !max-w-none normal-case !tracking-normal"
                icon={<BiFile size={18} />}
                iconPosition="left"
              >
                Upload documents
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  console.log("[DocumentsTab] Any file button clicked, ref:", docInputRef.current);
                  docInputRef.current?.click();
                }}
                disabled={isUploadingDoc || !!uploadError}
                className="!rounded-xl !h-11 !px-4 !max-w-none normal-case !tracking-normal text-slate-600"
                icon={<BiUpload size={18} />}
                iconPosition="left"
              >
                Any file
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload queue: per-file progress + success/error */}
      {uploadQueue.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
          {uploadQueue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item.status === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : item.status === "error"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {item.status === "success" ? (
                  <BiCheckCircle size={18} />
                ) : item.status === "error" ? (
                  <BiErrorCircle size={18} />
                ) : (
                  <BiLoaderAlt size={18} className="animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {item.name}
                  </p>
                  <span
                    className={`text-[10px] font-bold shrink-0 ${
                      item.status === "success"
                        ? "text-emerald-600"
                        : item.status === "error"
                          ? "text-rose-500"
                          : "text-slate-400"
                    }`}
                  >
                    {item.status === "success"
                      ? "Uploaded"
                      : item.status === "error"
                        ? "Failed"
                        : `${item.progress}%`}
                  </span>
                </div>
                {item.status === "error" ? (
                  <p className="text-[11px] text-rose-500 mt-1 truncate">
                    {item.error || "Upload failed"}
                  </p>
                ) : (
                  <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "success" ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {item.status === "error" && onDismissUploadItem && (
                <button
                  type="button"
                  onClick={() => onDismissUploadItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg shrink-0"
                  title="Dismiss"
                >
                  <BiX size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photos gallery */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <BiImage size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Photos</h3>
              <p className="text-xs text-slate-500">
                {photos.length} image{photos.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploadingDoc}
            className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            + Add photos
          </button>
        </div>
        <div className="p-4 sm:p-5">
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingDoc}
              className="w-full py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
            >
              <BiImages className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-semibold text-slate-500">
                No photos yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Click to upload profile or clinical photos
              </p>
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((doc) => (
                <div key={doc.id} className="space-y-1.5">
                  <div className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.url}
                      alt={doc.type}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setSelectedDoc(doc)}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[11px] font-semibold text-white truncate">
                        {doc.type}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className="w-8 h-8 rounded-lg bg-white/95 text-slate-700 flex items-center justify-center shadow"
                        title="View"
                      >
                        <BiDownload size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="w-8 h-8 rounded-lg bg-white/95 text-rose-600 flex items-center justify-center shadow"
                        title="Delete"
                      >
                        <BiTrash size={14} />
                      </button>
                    </div>
                  </div>
                  <NoteBlock doc={doc} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Documents list */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <BiFile size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Documents</h3>
              <p className="text-xs text-slate-500">
                {otherDocs.length} file{otherDocs.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => localDocInputRef.current?.click()}
            disabled={isUploadingDoc}
            className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            + Add documents
          </button>
        </div>
        <div className="p-4 sm:p-5">
          {otherDocs.length === 0 ? (
            <button
              type="button"
              onClick={() => localDocInputRef.current?.click()}
              disabled={isUploadingDoc}
              className="w-full py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
            >
              <BiFile className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-semibold text-slate-500">
                No documents yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDFs, Word files, or scanned certificates
              </p>
            </button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className="group p-4 bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-primary/20 transition-all !rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <BiFile size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editDocId === doc.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                            value={editDocLabel}
                            onChange={(e) => setEditDocLabel(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleRenameDoc(doc.id)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameDoc(doc.id)}
                            className="p-1.5 bg-emerald-500 text-white rounded-lg"
                          >
                            <BiCheckCircle size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditDocId(null)}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"
                          >
                            <BiX size={16} />
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-sm font-bold text-slate-800 truncate">
                          {doc.type}
                        </h4>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {doc.status ? ` · ${doc.status.replace(/_/g, " ")}` : ""}
                      </p>
                      <NoteBlock doc={doc} />
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditDocId(doc.id);
                            setEditDocLabel(doc.type);
                          }}
                          className="p-1.5 text-slate-400 hover:text-primary rounded-lg"
                        >
                          <BiEditAlt size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                        >
                          <BiTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Preview modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedDoc(null)}
          />
          <div className="relative w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-800 font-grotesk truncate">
                  {selectedDoc.type}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uploaded{" "}
                  {new Date(selectedDoc.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={selectedDoc.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200"
                >
                  <BiDownload size={14} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="w-10 h-10 rounded-xl bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center border border-slate-200"
                >
                  <BiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100/50 flex-1 flex items-center justify-center min-h-[50vh]">
              {isImage(selectedDoc) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedDoc.url}
                  alt={selectedDoc.type}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md bg-white p-2"
                />
              ) : selectedDoc.mimeType?.includes("pdf") ||
                selectedDoc.url?.endsWith(".pdf") ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex items-center justify-between w-full max-w-2xl bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber((p) => p - 1)}
                        className="px-3 py-1.5 bg-slate-100 rounded-lg disabled:opacity-40"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        disabled={numPages ? pageNumber >= numPages : true}
                        onClick={() => setPageNumber((p) => p + 1)}
                        className="px-3 py-1.5 bg-slate-100 rounded-lg disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                    <span>
                      Page {pageNumber} of {numPages || "…"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPdfScale((s) => Math.max(0.5, s - 0.1))
                        }
                        className="px-2 py-1 bg-slate-100 rounded-lg"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPdfScale((s) => Math.min(1.5, s + 0.1))
                        }
                        className="px-2 py-1 bg-slate-100 rounded-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="w-full flex justify-center overflow-auto max-h-[65vh] p-2">
                    {isMounted && (
                      <Document
                        file={getViewUrl(selectedDoc)}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex flex-col items-center py-16 gap-3">
                            <BiLoaderAlt
                              className="animate-spin text-primary"
                              size={32}
                            />
                            <p className="text-sm font-semibold text-slate-500">
                              Loading PDF…
                            </p>
                          </div>
                        }
                        error={
                          <div className="text-center py-16 text-rose-500 text-sm font-semibold">
                            Could not preview PDF. Use Download instead.
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={pdfScale}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                        />
                      </Document>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <BiFile className="mx-auto text-amber-500" size={40} />
                  <p className="text-sm font-bold text-slate-800">
                    Preview not available for this format
                  </p>
                  <a
                    href={selectedDoc.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl"
                  >
                    <BiDownload size={16} /> Download file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
