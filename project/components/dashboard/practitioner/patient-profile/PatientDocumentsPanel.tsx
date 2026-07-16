"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BiDownload,
  BiFile,
  BiImage,
  BiLoaderAlt,
  BiX,
  BiUpload,
  BiEditAlt,
  BiCheck,
  BiNote,
} from "react-icons/bi";
import { toast } from "react-hot-toast";
import type { PatientDocument } from "./types";

function isImageDoc(doc: PatientDocument) {
  return (
    !!doc.mimeType?.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif)$/i.test(doc.url || "")
  );
}

function isPdfDoc(doc: PatientDocument) {
  return (
    !!doc.mimeType?.includes("pdf") || !!doc.url?.toLowerCase().endsWith(".pdf")
  );
}

const ACCEPT_ALL =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function PatientDocumentsPanel({
  documents: documentsProp = [],
  patientName,
  patientId,
}: {
  documents?: PatientDocument[];
  patientName: string;
  patientId?: string;
}) {
  const [documents, setDocuments] = useState<PatientDocument[]>(documentsProp);
  const [preview, setPreview] = useState<PatientDocument | null>(null);
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocuments(documentsProp);
  }, [documentsProp]);

  const photos = documents.filter(isImageDoc);
  const files = documents.filter((d) => !isImageDoc(d));

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !patientId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", file.name.replace(/\.[^.]+$/, "") || "Document");
      const res = await fetch(`/api/practitioner/patients/${patientId}/documents`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to attach file");
      }
      setDocuments((prev) => [json.data, ...prev]);
      toast.success("File attached to patient record.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to attach file");
    } finally {
      setUploading(false);
    }
  };

  const startEditNote = (doc: PatientDocument) => {
    setNoteEditingId(doc.id);
    setNoteDraft(doc.note || "");
  };

  const saveNote = async (docId: string) => {
    if (!patientId) return;
    setSavingNote(true);
    try {
      const res = await fetch(
        `/api/practitioner/patients/${patientId}/documents/${docId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteDraft }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save note");
      }
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, note: noteDraft } : d)),
      );
      setNoteEditingId(null);
      toast.success("Note saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const NoteBlock = ({ doc }: { doc: PatientDocument }) => {
    const editing = noteEditingId === doc.id;
    if (editing) {
      return (
        <div className="mt-2 flex items-center gap-1.5">
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
            disabled={savingNote}
            className="p-1.5 bg-emerald-500 text-white rounded-lg shrink-0"
          >
            {savingNote ? (
              <BiLoaderAlt size={14} className="animate-spin" />
            ) : (
              <BiCheck size={14} />
            )}
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
        onClick={() => startEditNote(doc)}
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
        onClick={() => startEditNote(doc)}
        className="mt-1.5 text-[11px] font-semibold text-primary/70 hover:text-primary"
      >
        + Add note
      </button>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ALL}
        className="hidden"
        onChange={handleAttach}
      />
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <BiFile size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-grotesk">
              Patient documents
            </h3>
            <p className="text-xs text-slate-500">
              {documents.length} file{documents.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {patientId && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <BiLoaderAlt size={14} className="animate-spin" />
            ) : (
              <BiUpload size={14} />
            )}
            {uploading ? "Attaching…" : "Attach file"}
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {documents.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <BiFile className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-500">
              No documents uploaded yet
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When {patientName} uploads files, or you attach one, they will
              appear here.
            </p>
          </div>
        ) : (
          <>
            {photos.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Photos ({photos.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((doc) => (
                    <div key={doc.id} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setImgError(false);
                          setPreview(doc);
                        }}
                        className="group relative aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 text-left block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doc.url}
                          alt={doc.type}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-[11px] font-semibold text-white truncate">
                            {doc.type}
                            {doc.uploadedByPractitioner && " · You"}
                          </p>
                        </div>
                      </button>
                      <NoteBlock doc={doc} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Files ({files.length})
                </p>
                <ul className="space-y-2">
                  {files.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-primary/20 transition-colors"
                    >
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        {isPdfDoc(doc) ? (
                          <BiFile size={22} />
                        ) : (
                          <BiImage size={22} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {doc.type}
                          {doc.uploadedByPractitioner && (
                            <span className="ml-1.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full align-middle">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          {doc.createdAt
                            ? new Date(doc.createdAt).toLocaleDateString(
                                "en-ZA",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                          {doc.status ? ` · ${doc.status.replace(/_/g, " ")}` : ""}
                        </p>
                        <NoteBlock doc={doc} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setImgError(false);
                            setPreview(doc);
                          }}
                          className="text-xs font-bold text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-lg"
                        >
                          View
                        </button>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:text-primary rounded-lg"
                          title="Open / download"
                        >
                          <BiDownload size={18} />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            aria-label="Close preview"
            onClick={() => setPreview(null)}
          />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-800 truncate">
                  {preview.type}
                </h3>
                <p className="text-xs text-slate-500">
                  {preview.uploadedByPractitioner
                    ? "Attached by you"
                    : "Shared from patient profile"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <BiDownload size={14} /> Open
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <BiX size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1 flex items-center justify-center bg-slate-100/60 min-h-[40vh]">
              {isImageDoc(preview) && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.type}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl bg-white p-2 shadow"
                  onError={() => setImgError(true)}
                />
              ) : isPdfDoc(preview) ? (
                <iframe
                  title={preview.type}
                  src={preview.url}
                  className="w-full h-[70vh] rounded-xl bg-white border border-slate-200"
                />
              ) : (
                <div className="text-center space-y-3">
                  <BiLoaderAlt
                    className={imgError ? "hidden" : "animate-spin text-primary mx-auto"}
                    size={28}
                  />
                  <p className="text-sm font-semibold text-slate-600">
                    Preview not available — open the file instead.
                  </p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
                  >
                    <BiDownload size={14} /> Open file
                  </a>
                </div>
              )}
              {preview.note && (
                <div className="absolute inset-x-6 bottom-6 bg-white/95 border border-slate-200 rounded-xl px-4 py-3 shadow max-w-2xl mx-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Note
                  </p>
                  <p className="text-sm text-slate-700">{preview.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
