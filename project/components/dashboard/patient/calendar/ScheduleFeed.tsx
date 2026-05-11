import React from "react";
import { BiChevronLeft, BiChevronRight, BiCalendar } from "react-icons/bi";
import Carousel from "@/components/ui/Carousel";
import AppointmentCard from "./AppointmentCard";

interface Appointment {
  id: string;
  title?: string;
  dr?: string;
  dr_specialty?: string;
  time: string;
  date: string;
  type: "appointment" | "reminder" | "refill" | "note";
  status: "confirmed" | "pending" | "cancelled";
  concern?: string;
  notes?: string;
  location?: string;
  institution?: string;
  img?: string;
  countdown?: string;
  durationMinutes?: number;
}

interface ScheduleFeedProps {
  selectedDateStr: string;
  filteredAppointments: Appointment[];
  liveCarouselIndex: number;
  setLiveCarouselIndex: (idx: number) => void;
  isClient: boolean;
  isJoinable: (appt: Appointment) => boolean;
  getJoinCountdown: (appt: Appointment) => string;
  setSelectedAppointment: (appt: Appointment) => void;
}

const ScheduleFeed: React.FC<ScheduleFeedProps> = ({
  selectedDateStr,
  filteredAppointments,
  liveCarouselIndex,
  setLiveCarouselIndex,
  isClient,
  isJoinable,
  getJoinCountdown,
  setSelectedAppointment,
}) => {
  return (
    <section className="space-y-6 flex-1 flex flex-col min-h-[300px]">
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-slate-800 font-grotesk">
            Live Schedule Overview
          </h4>
          <p className="text-sm lg:text-base font-grotesk  text-slate-500">
            {selectedDateStr
              ? `Events for ${new Date(selectedDateStr).toLocaleDateString(
                  "en-ZA",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )}`
              : "Select a day to see events"}
          </p>
        </div>
        {filteredAppointments.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() =>
                setLiveCarouselIndex(Math.max(0, liveCarouselIndex - 1))
              }
              className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-500"
            >
              <BiChevronLeft size={24} />
            </button>
            <button
              onClick={() =>
                setLiveCarouselIndex(
                  Math.min(
                    filteredAppointments.length - 1,
                    liveCarouselIndex + 1,
                  ),
                )
              }
              className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 flex items-center justify-center text-slate-500"
            >
              <BiChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {filteredAppointments.length > 0 ? (
          <Carousel
            selectedItem={liveCarouselIndex}
            onChange={setLiveCarouselIndex}
            centerMode={true}
            centerSlidePercentage={
              isClient && window.innerWidth < 600 ? 100 : 45
            }
            className="h-full"
          >
            {filteredAppointments.map((appt, idx) => {
              const joinable = isJoinable(appt);
              const apptDateTime = new Date(`${appt.date}T${appt.time}`);
              const now = new Date();
              const isExpired = apptDateTime < now;

              return (
                <AppointmentCard
                  key={appt.id || idx}
                  appt={appt}
                  idx={idx}
                  isExpired={isExpired}
                  joinable={joinable}
                  getJoinCountdown={getJoinCountdown}
                  onSelect={setSelectedAppointment}
                />
              );
            })}
          </Carousel>
        ) : (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col items-center justify-center">
            <BiCalendar size={32} className="mx-auto mb-3 opacity-30" />
            <h1 className=" font-semibold">
              No events scheduled for this day.
            </h1>
            <p className="text-sm mt-1">Tap a date above to add one.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ScheduleFeed;
