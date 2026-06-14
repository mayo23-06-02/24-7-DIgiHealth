"use client";

import React, { useState, useEffect } from "react";
import { BiFile, BiUpload, BiLoaderAlt, BiImage, BiEditAlt, BiTrash, BiCheckCircle, BiX, BiDownload } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// Import react-pdf and configure worker
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface UserDocument {
  id: string;
  type: string;
  url: string;
  mimeType: string;
  status: string;
  createdAt: string;
}

interface DocumentsTabProps {
  documents: UserDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<UserDocument[]>>;
  isUploadingDoc: boolean;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  handleDocUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteDoc: (id: string) => void;
  handleRenameDoc: (id: string) => void;
  editDocId: string | null;
  setEditDocId: (id: string | null) => void;
  editDocLabel: string;
  setEditDocLabel: (label: string) => void;
}

function SectionHead({
  icon,
  title,
  sub,
  color = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    gray: "bg-slate-500/10 text-slate-500",
  };
  return (
    <div className="flex items-center gap-5">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          colorMap[color] || colorMap.primary
        }`}
      >
        {icon}
      </div>
      <div className="gap-1 flex flex-col">
        <h4 className="text-xl font-bold text-slate-800 tracking-tight font-grotesk">
          {title}
        </h4>
        <p className="text-xs text-slate-600 uppercase opacity-70">{sub}</p>
      </div>
    </div>
  );
}

export default function DocumentsTab({
  documents,
  setDocuments,
  isUploadingDoc,
  docInputRef,
  handleDocUpload,
  handleDeleteDoc,
  handleRenameDoc,
  editDocId,
  setEditDocId,
  editDocLabel,
  setEditDocLabel,
}: DocumentsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(0.9);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  /**
   * Route PDF URLs through our server-side proxy to avoid Cloudinary 401/CORS errors.
   * Images load fine directly; only PDFs need the proxy.
   */
  function getViewUrl(doc: UserDocument): string {
    const isPdf =
      doc.mimeType.includes("pdf") || doc.url.toLowerCase().endsWith(".pdf");
    if (!isPdf) return doc.url;
    if (doc.url.includes("firebasestorage.googleapis.com")) {
      return doc.url;
    }
    return `/api/user/documents/proxy?url=${encodeURIComponent(doc.url)}`;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHead
          icon={<BiFile size={24} />}
          title="Document Repository"
          sub="Manage clinical records and identity assets"
        />
        <Button
          onClick={() => docInputRef.current?.click()}
          disabled={isUploadingDoc}
          className="rounded-2xl px-8 h-14 bg-primary text-white flex items-center gap-2"
        >
          {isUploadingDoc ? (
            <BiLoaderAlt className="animate-spin" size={20} />
          ) : (
            <BiUpload size={20} />
          )}
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-100 bg-slate-50/30">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6">
            <BiUpload size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 font-grotesk mb-2">
            No documents synchronized
          </h3>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Upload your clinical reports, identity documents or medical
            certificates for secure cloud access.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="group p-6 bg-white border-slate-100 shadow-slate-900/5 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    doc.mimeType.startsWith("image/")
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {doc.mimeType.startsWith("image/") ? (
                    <BiImage size={28} />
                  ) : (
                    <BiFile size={28} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditDocId(doc.id);
                      setEditDocLabel(doc.type);
                    }}
                    className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                  >
                    <BiEditAlt size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <BiTrash size={18} />
                  </button>
                </div>
              </div>

              {editDocId === doc.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    autoFocus
                    className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={editDocLabel}
                    onChange={(e) => setEditDocLabel(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleRenameDoc(doc.id)
                    }
                  />
                  <button
                    onClick={() => handleRenameDoc(doc.id)}
                    className="p-1.5 bg-emerald-500 text-white rounded-lg"
                  >
                    <BiCheckCircle size={16} />
                  </button>
                  <button
                    onClick={() => setEditDocId(null)}
                    className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"
                  >
                    <BiX size={16} />
                  </button>
                </div>
              ) : (
                <h3 className="text-lg font-bold text-slate-800 truncate mb-1 pr-10">
                  {doc.type}
                </h3>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  {new Date(doc.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="flex items-center gap-1.5 text-sm font-bold text-primary uppercase tracking-widest hover:underline cursor-pointer font-sans"
                >
                  <BiDownload size={14} /> View File
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setSelectedDoc(null)}
          />
          <div className="relative w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-grotesk truncate max-w-lg">
                  {selectedDoc.type}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Uploaded on {new Date(selectedDoc.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={selectedDoc.url}
                  download
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
                >
                  <BiDownload size={14} /> Download File
                </a>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="w-10 h-10 rounded-xl bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center border border-slate-150 hover:border-rose-100 transition-all font-bold font-sans"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-100/50 flex-1 flex items-center justify-center min-h-[60vh]">
              {selectedDoc.mimeType.startsWith("image/") ? (
                <img
                  src={selectedDoc.url}
                  alt={selectedDoc.type}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md bg-white p-2"
                />
              ) : selectedDoc.mimeType.includes("pdf") || selectedDoc.url.endsWith(".pdf") ? (
                <div className="flex flex-col items-center gap-4 w-full h-full">
                  <div className="flex items-center justify-between w-full max-w-2xl bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
                    <div className="flex gap-2">
                      <button
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber((p) => p - 1)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-250 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        ◀ Previous
                      </button>
                      <button
                        disabled={numPages ? pageNumber >= numPages : true}
                        onClick={() => setPageNumber((p) => p + 1)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-250 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Next ▶
                      </button>
                    </div>
                    <span>
                      Page {pageNumber} of {numPages || "..."}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.1))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-250 rounded-lg"
                      >
                        ➖
                      </button>
                      <button
                        onClick={() => setPdfScale((s) => Math.min(1.5, s + 0.1))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-250 rounded-lg"
                      >
                        ➕
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex-1 min-h-[60vh] flex items-center justify-center p-4 bg-slate-200/40 rounded-2xl overflow-auto border border-slate-200 max-h-[70vh]">
                    <div className="shadow-lg rounded-xl overflow-hidden bg-white p-4">
                      {isMounted && (
                        <Document
                          file={getViewUrl(selectedDoc)}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                              <BiLoaderAlt className="animate-spin text-primary animate-duration-1000" size={36} />
                              <p className="text-sm font-bold text-slate-500">Decrypting document pages...</p>
                            </div>
                          }
                          error={
                            <div className="text-center py-20 text-rose-500 font-bold text-sm">
                              Failed to render PDF. Please use the Download button in the header.
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
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-sm">
                    <BiFile size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Preview not supported for this file format</p>
                    <p className="text-xs text-slate-500 mt-1">You can download the file to view its content.</p>
                  </div>
                  <a
                    href={selectedDoc.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-bold text-xs rounded-xl shadow-sm hover:bg-primary/95 transition-all"
                  >
                    <BiDownload size={16} /> Download File
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
