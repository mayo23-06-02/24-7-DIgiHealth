"use client";

import React, { useState, useEffect } from "react";
import {
  BiChevronRight,
  BiChevronLeft,
  BiCaretDown,
  BiTrendingUp,
  BiShieldPlus,
} from "react-icons/bi";
import EntityCard from "@/components/shared/EntityCard";
import EntityModal from "@/components/shared/EntityModal";
import ChatModal from "./ChatModal";
import VoiceCallModal from "./VoiceCallModal";
import VideoCallModal from "./VideoCallModal";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Carousel from "@/components/ui/Carousel";

export default function HealthActionCenter() {
  const [isClient, setIsClient] = useState(false);
  const [doctorIndex, setDoctorIndex] = useState(0);
  const [facilityIndex, setFacilityIndex] = useState(0);
  const [doctorsData, setDoctorsData] = useState<any[]>([]);
  const [facilitiesData, setFacilitiesData] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    fetch("/api/patient/practitioners")
      .then((res) => res.json())
      .then(setDoctorsData)
      .catch(console.error);

    fetch("/api/patient/facilities")
      .then((res) => res.json())
      .then(setFacilitiesData)
      .catch(console.error);
  }, []);

  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [activeChatDoctor, setActiveChatDoctor] = useState<{
    name: string;
    avatarUrl?: string;
  } | null>(null);
  const [activeVoiceDoctor, setActiveVoiceDoctor] = useState<{
    name: string;
    avatarUrl?: string;
  } | null>(null);
  const [activeVideoDoctor, setActiveVideoDoctor] = useState<{
    name: string;
    avatarUrl?: string;
  } | null>(null);

  const handleBookDoctor = (doctorId: string) => {
    console.log(`Booking doctor: ${doctorId}`);
  };

  const handleMessageDoctor = (doctorId: string) => {
    const doctor = doctorsData.find((d) => d.id === doctorId);
    if (doctor)
      setActiveChatDoctor({ name: doctor.name, avatarUrl: doctor.avatarUrl });
  };

  const handleVoiceDoctor = (doctorId: string) => {
    const doctor = doctorsData.find((d) => d.id === doctorId);
    if (doctor)
      setActiveVoiceDoctor({ name: doctor.name, avatarUrl: doctor.avatarUrl });
  };

  const handleVideoDoctor = (doctorId: string) => {
    const doctor = doctorsData.find((d) => d.id === doctorId);
    if (doctor)
      setActiveVideoDoctor({ name: doctor.name, avatarUrl: doctor.avatarUrl });
  };

  const handleDirections = (facilityId: string) => {
    const facility = facilitiesData.find((f) => f.id === facilityId);
    if (facility)
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(facility.address)}`,
        "_blank",
      );
  };

  return (
    <Card
      className="flex flex-col h-full overflow-hidden"
      variant="solid"
      noPadding
    >
      {/* HEADER - Consistent with others */}
      <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
            <BiShieldPlus size={28} />
          </div>
          <div>
            <Badge
              label="Clinical Intelligence"
              status="premium"
              variant="soft"
              dot
              className="mb-1"
            />
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-none font-grotesk">
              Health Hub
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-10 h-10 p-0 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
        >
          <BiCaretDown size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
        {/* SPECIALISTS SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(0,82,204,0.4)]" />
              <h4 className="text-sm font-bold text-slate-700  tracking-normal font-grotesk">
                Medical Specialists
              </h4>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setDoctorIndex((prev) => Math.max(0, prev - 1))}
                className="w-10 h-10 p-0 bg-slate-50 hover:bg-primary hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronLeft size={24} />
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setDoctorIndex((prev) =>
                    Math.min(doctorsData.length - 1, prev + 1),
                  )
                }
                className="w-10 h-10 p-0 bg-slate-50 hover:bg-primary hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronRight size={24} />
              </Button>
            </div>
          </div>

          <Carousel
            selectedItem={doctorIndex}
            onChange={setDoctorIndex}
            centerMode={true}
            centerSlidePercentage={
              isClient && window.innerWidth < 1024 ? 90 : 85
            }
          >
            {doctorsData.map((doctor) => (
              <div key={doctor.id} className="px-3 pb-8 h-full">
                <EntityCard
                  data={{
                    id: doctor.id,
                    name: doctor.name,
                    subtitle: doctor.specialisation,
                    image: doctor.avatarUrl,
                    rating: doctor.rating,
                    location: doctor.hospital || "Private Practice",
                    tags: doctor.tags || ["GP", "Family Care"],
                    status: "online",
                    type: "practitioner",
                  }}
                  onClick={(data) =>
                    setSelectedEntity({
                      ...doctor,
                      ...data,
                      type: "practitioner",
                      description:
                        doctor.bio ||
                        "Experienced practitioner dedicated to patient wellbeing.",
                    })
                  }
                />
              </div>
            ))}
          </Carousel>
        </section>

        {/* FACILITIES SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <h4 className="text-sm font-bold text-slate-700  tracking-normal font-grotesk">
                Nearest Facilities
              </h4>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setFacilityIndex((prev) => Math.max(0, prev - 1))
                }
                className="w-10 h-10 p-0 bg-slate-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronLeft size={24} />
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setFacilityIndex((prev) =>
                    Math.min(facilitiesData.length - 1, prev + 1),
                  )
                }
                className="w-10 h-10 p-0 bg-slate-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-400"
              >
                <BiChevronRight size={24} />
              </Button>
            </div>
          </div>

          <Carousel
            selectedItem={facilityIndex}
            onChange={setFacilityIndex}
            centerMode={true}
            centerSlidePercentage={
              isClient && window.innerWidth < 1024 ? 90 : 85
            }
          >
            {facilitiesData.map((facility) => (
              <div key={facility.id} className="px-3 pb-8 h-full">
                <EntityCard
                  data={{
                    id: facility.id,
                    name: facility.name,
                    subtitle: facility.type,
                    image: facility.image,
                    rating: facility.rating,
                    location: facility.distance,
                    tags: facility.services || ["General Care", "Pharmacy"],
                    type: "facility",
                  }}
                  onClick={(data) =>
                    setSelectedEntity({
                      ...facility,
                      ...data,
                      type: "facility",
                      tags: facility.services || ["General Care", "Pharmacy"],
                      description:
                        facility.about ||
                        "Medical facility providing comprehensive care.",
                    })
                  }
                />
              </div>
            ))}
          </Carousel>
        </section>

        {/* INSIGHTS CTA */}
        <Button
          variant="ghost"
          className="w-full !h-auto bg-linear-to-r from-primary/5 to-transparent border border-primary/10 rounded-2xl p-6 text-xs font-bold text-primary  tracking-normal hover:bg-primary hover:text-white transition-all duration-700 flex items-center justify-center gap-3 active:scale-95 shadow-none group"
        >
          <BiTrendingUp
            size={20}
            className="group-hover:scale-110 transition-transform"
          />
          Advanced Health Analytics & Insights
        </Button>
      </div>

      {/* MODALS */}
      {selectedEntity && (
        <EntityModal
          entity={selectedEntity}
          isOpen={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onBook={handleBookDoctor}
          onMessage={handleMessageDoctor}
          onVoiceCall={handleVoiceDoctor}
          onVideoCall={handleVideoDoctor}
          onDirections={handleDirections}
        />
      )}

      {activeChatDoctor && (
        <ChatModal
          isOpen={!!activeChatDoctor}
          onClose={() => setActiveChatDoctor(null)}
          practitionerName={activeChatDoctor.name}
          practitionerAvatar={activeChatDoctor.avatarUrl}
          consultationId="CONS-QUICK-SYNC"
        />
      )}

      {activeVoiceDoctor && (
        <VoiceCallModal
          isOpen={!!activeVoiceDoctor}
          onClose={() => setActiveVoiceDoctor(null)}
          practitionerName={activeVoiceDoctor.name}
          practitionerAvatar={activeVoiceDoctor.avatarUrl}
        />
      )}

      {activeVideoDoctor && (
        <VideoCallModal
          isOpen={!!activeVideoDoctor}
          onClose={() => setActiveVideoDoctor(null)}
          practitionerName={activeVideoDoctor.name}
          practitionerAvatar={activeVideoDoctor.avatarUrl}
        />
      )}
    </Card>
  );
}
