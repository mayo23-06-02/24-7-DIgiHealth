import React from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  BiUser,
  BiStar,
  BiMedal,
  BiMessageRounded,
  BiCalendarPlus,
  BiCheckCircle,
  BiLinkAlt,
  BiUnlink,
} from "react-icons/bi";
import Avatar from "../ui/Avatar";

interface Review {
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  isOnline: boolean;
  avatar?: string;
  bio?: string;
  experienceYears?: number;
  achievements?: string[];
  reviews?: Review[];
  schedule?: string[];
}

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onBook: (id: string) => void;
  onMessage: (id: string) => void;
  onLink?: (id: string, action: "link" | "unlink") => void;
  isMyDoctor?: boolean;
}

export default function DoctorModal({
  isOpen,
  onClose,
  doctor,
  onBook,
  onMessage,
  onLink,
  isMyDoctor = false,
}: DoctorModalProps) {
  if (!doctor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Practitioner Profile"
      size="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Profile */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div
            className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center  relative cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all"
            onClick={() => onMessage(doctor.id)}
          >
            {doctor.isOnline && (
              <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse z-10" />
            )}
            {!doctor.avatar ? (
              <Avatar src={doctor.avatar} name={doctor.name} size="xl" />
            ) : (
              <BiUser className="text-4xl text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <h2
              className="text-xl font-bold text-slate-800 leading-tight cursor-pointer hover:text-primary transition-all"
              onClick={() => onMessage(doctor.id)}
            >
              {doctor.name}
            </h2>
            <p className="text-primary ">{doctor.specialisation}</p>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-lg">
                <BiStar size={18} className="fill-amber-400 text-amber-400" />
                <span className="font-bold text-amber-700">
                  {doctor.rating}
                </span>
                <span className="text-xs text-amber-600/70">
                  ({doctor.reviewCount} Reviews)
                </span>
              </div>
              {doctor.experienceYears && (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {doctor.experienceYears} YRS EXP
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {doctor.languages?.map((lang) => (
                <Badge key={lang} label={lang} variant="soft" />
              ))}
            </div>
          </div>

          <div className="text-right space-y-4">
            <p className="text-xs text-slate-400 uppercase ">Consultation</p>
            <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl inline-block mt-1">
              INCLUDED IN PLAN
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-slate-100" />

        {/* Bio */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-normal mb-2">
            About
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {doctor.bio || "No professional biography provided."}
          </p>
        </div>

        {/* Achievements */}
        {doctor.achievements && doctor.achievements.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-normal mb-3">
              Professional Achievements
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doctor.achievements.map((achieve, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <BiMedal className="text-amber-500 shrink-0 text-lg mt-0.5" />
                  <span className="font-medium">{achieve}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Schedule Preview */}
        {doctor.schedule && doctor.schedule.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-normal mb-3">
              Next Available Slots Today
            </h3>
            <div className="flex flex-wrap gap-2">
              {doctor.schedule.map((time, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="px-4 py-2 h-auto bg-primary/5 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all !min-w-0"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
          <Button
            className={` ${isMyDoctor ? "bg-slate-100 text-slate-800" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"}`}
            variant="outline"
            fullWidth
            onClick={() => onLink?.(doctor.id, isMyDoctor ? "unlink" : "link")}
          >
            {isMyDoctor ? (
              <>
                <BiUnlink className="mr-2 text-xl" /> Remove from Team
              </>
            ) : (
              <>
                <BiLinkAlt className="mr-2 text-xl" /> Add to Care Team
              </>
            )}
          </Button>
          <Button
            className=" bg-primary text-white shadow-none shadow-primary/30 !min-w-0"
            onClick={() => onBook(doctor.id)}
            fullWidth
          >
            <BiCalendarPlus className="mr-2 text-xl" /> Book Consultation
          </Button>
        </div>

        {/* Reviews Section */}
        {doctor.reviews && doctor.reviews.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-normal mb-4">
              Patient Feedback
            </h3>
            <div className="space-y-4">
              {doctor.reviews.map((review, i) => (
                <div
                  key={i}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        {review.reviewer.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 leading-none flex items-center gap-1">
                          {review.reviewer}{" "}
                          <BiCheckCircle className="text-emerald-500" />
                        </p>
                        <span className="text-xs text-slate-400 font-bold uppercase">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <BiStar
                          key={idx}
                          size={14}
                          className={
                            idx < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 italic">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
