"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BiMapPin, BiStar, BiVideo, BiChat, BiCalendar, BiUserPlus, BiUserMinus } from "react-icons/bi";
import { VerifiedIcon } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  doctor: any;
  onBook?: (id: string) => void;
  onMessage?: (id: string) => void;
  onLink?: (id: string, action: "link" | "unlink") => void;
  isMyDoctor?: boolean;
}

export default function DoctorProfileModal({
  isOpen,
  onClose,
  doctor,
  onBook,
  onMessage,
  onLink,
  isMyDoctor = false,
}: Props) {
  if (!doctor) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Doctor Profile" width="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar
            name={doctor.name}
            src={doctor.avatarUrl}
            size="xl"
            status={doctor.isOnline ? "online" : "offline"}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">{doctor.name}</h2>
              <VerifiedIcon fill="#4493b8" className="w-5 h-5 text-white" />
            </div>
            <p className="text-primary font-medium">{doctor.specialisation}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <BiStar className="text-amber-400" size={16} />
                {doctor.rating?.toFixed(1) || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <BiMapPin size={16} />
                {doctor.location || doctor.city || "South Africa"}
              </span>
              {doctor.experienceYears && (
                <span>{doctor.experienceYears} years experience</span>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        {doctor.about && (
          <div>
            <h3 className="font-bold text-slate-800 mb-2">About</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{doctor.about}</p>
          </div>
        )}

        {/* Languages */}
        {doctor.languages && doctor.languages.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-800 mb-2">Languages</h3>
            <div className="flex flex-wrap gap-2">
              {doctor.languages.map((lang: string) => (
                <Badge key={lang} label={lang} variant="outline" className="text-xs" />
              ))}
            </div>
          </div>
        )}

        {/* Consultation Info */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <BiVideo size={18} />
              <span className="text-sm font-medium">Video Consultation</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              R{doctor.consultationFee || "450"}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <BiChat size={18} />
              <span className="text-sm font-medium">Chat Consultation</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              R{doctor.chatFee || "200"}
            </p>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          {isMyDoctor ? (
            <Button
              variant="outline"
              className="flex-1"
              icon={<BiUserMinus size={18} />}
              onClick={() => onLink?.(doctor.id, "unlink")}
            >
              Remove from My Doctors
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1"
              icon={<BiUserPlus size={18} />}
              onClick={() => onLink?.(doctor.id, "link")}
            >
              Add to My Doctors
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            icon={<BiChat size={18} />}
            onClick={() => onMessage?.(doctor.id)}
          >
            Message
          </Button>
          <Button
            className="flex-1"
            icon={<BiCalendar size={18} />}
            onClick={() => onBook?.(doctor.id)}
          >
            Book Appointment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
