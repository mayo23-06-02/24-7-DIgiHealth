"use client";

import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";
import Avatar from "@/components/ui/Avatar";

interface Doctor {
  id: string;
  name: string;
  avatar?: string;
  specialisation?: string;
  isFavorite?: boolean;
}

interface FavoriteDoctorsProps {
  isCollapsed: boolean;
  onClose?: () => void;
}

export default function FavoriteDoctors({
  isCollapsed,
  onClose,
}: FavoriteDoctorsProps) {
  const { navigate } = useNavigate();
  const [favoriteDoctors, setFavoriteDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFavoriteDoctors();
  }, []);

  const fetchFavoriteDoctors = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/patient/my-doctors?favorite=true");
      if (res.ok) {
        const data = await res.json();
        setFavoriteDoctors(data.slice(0, 2));
      }
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorClick = async (doctor: Doctor) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId: doctor.id,
          contactId: doctor.id,
        }),
      });
      const data = res.ok ? await res.json() : null;
      const conversationId = data?.conversationId;
      if (conversationId) {
        navigate(`/patient/messages?chatId=${conversationId}`);
      } else {
        navigate(`/patient/messages?doctorId=${doctor.id}`);
      }
      if (window.innerWidth < 1024 && onClose) onClose();
    } catch {
      navigate(`/patient/messages?doctorId=${doctor.id}`);
      if (window.innerWidth < 1024 && onClose) onClose();
    }
  };

  const handleAddDoctor = () => {
    navigate("/patient/doctors");
    if (window.innerWidth < 1024 && onClose) onClose();
  };

  if (isCollapsed) return null;

  return (
    <div className="px-4 py-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">
            Favorite Doctors
          </p>
        </div>
        <button
          onClick={handleAddDoctor}
          title="Add doctor to favorites"
          className="p-1.5 hover:bg-primary/10 rounded-md transition-colors text-ink-600 hover:text-primary"
        >
          <Plus size={14} />
        </button>
      </div>

      {favoriteDoctors.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-ink-500 mb-3">
            No favorite doctors yet
          </p>
          <button
            onClick={handleAddDoctor}
            className="w-full py-2 px-3 bg-primary/8 text-primary text-xs font-semibold rounded-lg hover:bg-primary/12 transition-colors"
          >
            Add Doctors
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {favoriteDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-soft transition-colors group"
            >
              <button
                onClick={() => handleDoctorClick(doctor)}
                className="flex items-center gap-2.5 flex-1 min-w-0"
                title={`Chat with ${doctor.name}`}
              >
                <Avatar
                  src={doctor.avatar}
                  alt={doctor.name}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold text-ink-900 truncate">
                    {doctor.name}
                  </p>
                  <p className="text-[10px] text-ink-500 truncate">
                    {doctor.specialisation || "Doctor"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDoctorClick(doctor)}
                className="p-1.5 text-ink-400 hover:text-primary hover:bg-primary/8 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                title={`Message ${doctor.name}`}
              >
                <MessageCircle size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
