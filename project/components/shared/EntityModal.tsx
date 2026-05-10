"use client";

import React from "react";
import {
  BiStar,
  BiMapPin,
  BiPhone,
  BiEnvelope,
  BiCalendarCheck,
  BiMessageDetail,
  BiNavigation,
  BiShareAlt,
  BiHeart,
  BiFlag,
  BiVideo,
  BiMicrophone,
} from "react-icons/bi";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

interface EntityProfile {
  id: string;
  type: "practitioner" | "facility";
  name: string;
  subtitle: string;
  image?: string;
  avatarUrl?: string;
  rating?: number;
  reviewsCount?: number;
  location: string;
  address?: string;
  description: string;
  tags: string[];
  contact?: { phone?: string; email?: string };
  stats?: { label: string; value: string }[];
}

interface EntityModalProps {
  entity: EntityProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (id: string) => void;
  onMessage?: (id: string) => void;
  onVoiceCall?: (id: string) => void;
  onVideoCall?: (id: string) => void;
  onDirections?: (id: string) => void;
}

const EntityModal: React.FC<EntityModalProps> = ({
  entity,
  isOpen,
  onClose,
  onBook,
  onMessage,
  onVoiceCall,
  onVideoCall,
  onDirections,
}) => {
  if (!entity) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${entity.type === "practitioner" ? "Provider" : "Facility"} Profile`}
      width="lg"
    >
      <div className="space-y-10">
        {/* Cover & Identity */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative shrink-0">
            <Avatar
              src={entity.avatarUrl || entity.image}
              name={entity.name}
              size="xl"
              status="online"
              className="ring-8 ring-slate-50 shadow-none"
            />
            <div className="absolute -bottom-2 -right-2">
              <Badge
                label={entity.type === "practitioner" ? "Verified" : "Active"}
                status="premium"
                variant="solid"
                dot
              />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
                {entity.name}
              </h2>
              {entity.rating && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-gray-500 font-bold text-sm">
                  <BiStar />
                  {entity.rating}
                  <span className="text-gray-300 text-xs ml-1">
                    ({entity.reviewsCount || 0})
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm font-bold text-primary -normal">
              {entity.subtitle}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-500 text-sm font-medium">
              <div className="flex items-center gap-2">
                <BiMapPin className="text-primary" />
                {entity.location}
              </div>
              {entity.contact?.phone && (
                <div className="flex items-center gap-2">
                  <BiPhone className="text-emerald-500" />
                  {entity.contact.phone}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="white"
              className="w-12 h-12 p-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all min-w-0!"
            >
              <BiHeart size={20} />
            </Button>
            <Button
              variant="white"
              className="w-12 h-12 p-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-all min-w-0!"
            >
              <BiShareAlt size={20} />
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        {entity.stats && entity.stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {entity.stats.map((stat, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-3xl text-center">
                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs font-bold text-slate-500 -normal mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 tracking-tight uppercase  text-slate-300">
                Overview
              </h4>
              <p className="text-slate-600 font-medium leading-[1.8] text-sm">
                {entity.description}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 tracking-tight -normal text-slate-300">
                Specializations & Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {entity.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 rounded-xl bg-slate-100/50 text-slate-500 text-xs font-bold -normal"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-lg font-bold text-slate-900 tracking-tight -normal text-xs text-slate-300">
              Quick Actions
            </h4>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => onBook(entity.id)}
                className="w-full h-14 justify-between"
              >
                <span>Book Appointment</span>
                <BiCalendarCheck size={20} />
              </Button>

              {entity.type === "practitioner" && (
                <div className="space-y-3">
                  {onMessage && (
                    <Button
                      variant="white"
                      onClick={() => onMessage(entity.id)}
                      className="w-full h-14 justify-between border-slate-100"
                    >
                      <span className="text-slate-700">
                        Send Secure Message
                      </span>
                      <BiMessageDetail size={20} className="text-primary" />
                    </Button>
                  )}
                  {onVoiceCall && (
                    <Button
                      variant="white"
                      onClick={() => onVoiceCall(entity.id)}
                      className="w-full h-14 justify-between border-slate-100"
                    >
                      <span className="text-slate-700">Start Voice Call</span>
                      <BiMicrophone size={20} className="text-emerald-500" />
                    </Button>
                  )}
                  {onVideoCall && (
                    <Button
                      variant="white"
                      onClick={() => onVideoCall(entity.id)}
                      className="w-full h-14 justify-between border-slate-100"
                    >
                      <span className="text-slate-700">
                        Start Video Consultation
                      </span>
                      <BiVideo size={20} className="text-trust-blue" />
                    </Button>
                  )}
                </div>
              )}

              {entity.type === "facility" && onDirections && (
                <Button
                  variant="white"
                  onClick={() => onDirections(entity.id)}
                  className="w-full h-14 justify-between border-slate-100"
                >
                  <span className="text-slate-700">Get Directions</span>
                  <BiNavigation size={20} className="text-emerald-500" />
                </Button>
              )}
            </div>

            <div className="p-4 bg-red-50/50 rounded-2xl flex items-start gap-4 mt-6">
              <BiFlag className="text-red-400 shrink-0 mt-1" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-red-900 uppercase">
                  POPIA Notice
                </span>
                <p className="text-xs text-red-700/60 font-medium leading-normal">
                  Data shared during consultations is protected by 24/7 Care
                  Plus encryption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EntityModal;
