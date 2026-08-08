"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

interface Doctor {
  id: string;
  name: string;
  avatar?: string;
  specialisation?: string;
  isFavorite?: boolean;
}

interface AddFavoriteDoctorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
  selectedDoctorIds: string[];
}

export default function AddFavoriteDoctorsPanel({
  isOpen,
  onClose,
  onSave,
  selectedDoctorIds,
}: AddFavoriteDoctorsPanelProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedDoctorIds);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAllDoctors();
      setSelected(selectedDoctorIds);
    }
  }, [isOpen, selectedDoctorIds]);

  const fetchAllDoctors = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/patient/practitioners");
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch {
      toast.error("Failed to load doctors");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (doctorId: string) => {
    setSelected((prev) => {
      if (prev.includes(doctorId)) {
        return prev.filter((id) => id !== doctorId);
      } else if (prev.length < 2) {
        return [...prev, doctorId];
      }
      return prev;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Save selected doctors as favorites
      for (const id of selected) {
        await fetch(`/api/patient/my-doctors/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      }
      // Remove from favorites
      const toRemove = selectedDoctorIds.filter((id) => !selected.includes(id));
      for (const id of toRemove) {
        await fetch(`/api/patient/my-doctors/${id}`, {
          method: "DELETE",
        });
      }
      toast.success("Favorite doctors updated");
      onSave(selected);
      onClose();
    } catch {
      toast.error("Failed to update favorites");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Add Favorite Doctors</h2>
            <p className="text-xs text-ink-600 mt-1">Select up to 2 doctors</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-soft rounded-lg transition-colors text-ink-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-ink-600 text-sm">No doctors available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doctor) => (
                <label
                  key={doctor.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-soft cursor-pointer transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(doctor.id)}
                    onChange={() => handleToggle(doctor.id)}
                    disabled={
                      selected.length >= 2 && !selected.includes(doctor.id)
                    }
                    className="w-4 h-4 rounded border-border text-primary cursor-pointer accent-primary"
                  />
                  <Avatar
                    src={doctor.avatar}
                    name={doctor.name}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">
                      {doctor.name}
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      {doctor.specialisation || "Practitioner"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-5 space-y-3">
          <p className="text-xs text-ink-600 text-center">
            {selected.length}/2 selected
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleSave}
              disabled={isSaving || selected.length === 0}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
