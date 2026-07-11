"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BiChevronLeft,
  BiStar,
  BiHistory,
  BiHeart,
  BiShareAlt,
  BiCheckCircle,
  BiVideo,
  BiMessageDetail,
  BiMap,
  BiCalendarEvent,
  BiDollar,
  BiWorld,
  BiCheckShield,
  BiUser,
} from "react-icons/bi";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";

import BookingModal from "@/components/doctor/BookingModal";

export default function DoctorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetch(`/api/practitioners/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDoc(json.data);
        } else {
          setDoc(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch doctor profile", err);
        setDoc(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500  tracking-normal leading-none">
          Retrieving Encrypted Practitioner Profile...
        </p>
      </div>
    );

  if (!doc) return <div>Doctor not found.</div>;

  return (
    <div className="p-6 lg:p-10  mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <div className="relative shrink-0">
          <div className="w-48 h-48 rounded-lg bg-white p-2 border-4 border-primary/10  overflow-hidden group">
            <div className="w-full h-full flex items-center justify-center rounded-lg overflow-hidden bg-slate-100 relative">
              {doc.avatar ? (
                <Avatar
                  name={doc.name}
                  size="2xl"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <BiUser className="text-6xl" />
                </div>
              )}
              {doc.online && (
                <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse shadow-none" />
              )}
            </div>
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-lg  border border-slate-100 flex items-center gap-2">
            <BiStar className="text-gray-400" />
            <span className="text-sm font-bold text-slate-800">
              {doc.rating?.toFixed(1) || "5.0"}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight font-grotesk">
              {doc.name}
            </h1>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <Badge
                label={doc.specialisation}
                variant="soft"
                className=" font-bold text-xs"
              />
              <span className="text-slate-300">|</span>
              <span className="text-xs font-bold text-slate-500">
                HPCSA Reg: MP{String(id).slice(-6)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-start gap-8">
            <div className="flex flex-col">
              <span className="text-xs  text-slate-500  tracking-normal mb-1 text-center lg:text-left">
                Experience
              </span>
              <span className="font-bold text-slate-500">
                {doc.experienceYears || 10}+ Years
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs  text-slate-500  tracking-normal mb-1 text-center lg:text-left">
                Languages
              </span>
              <span className="font-bold text-slate-500">
                {doc.languages?.join(", ") || "English"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs  text-slate-500  tracking-normal mb-1 text-center lg:text-left">
                Reviews
              </span>
              <span className="font-bold text-slate-500">
                {doc.reviewCount || 50}+ Verified
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button
              className=""
              onClick={() => setShowBooking(true)}
              icon={<BiCalendarEvent className="text-xl" />}
              iconPosition="left"
            >
              Book Clinical Session
            </Button>
            <Button
              variant="outline"
              className=""
              onClick={async () => {
                try {
                  const res = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      practitionerId: doc.id,
                      contactId: doc.id,
                    }),
                  });
                  const data = res.ok ? await res.json() : null;
                  if (data?.conversationId) {
                    router.push(
                      `/patient/messages?chatId=${data.conversationId}`,
                    );
                    return;
                  }
                } catch {
                  /* fall through */
                }
                router.push(`/patient/messages?doctorId=${doc.id}`);
              }}
              icon={<BiMessageDetail className="text-xl" />}
              iconPosition="left"
            >
              Message Practitioner
            </Button>
          </div>
        </div>
      </div>

      {/* DETAIL CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* BIO */}
          <Card className="p-12 space-y-6" variant="solid">
            <h4 className="text-sm font-bold text-slate-500   font-grotesk">
              Professional Biography
            </h4>
            <p className="text-slate-600 leading-relaxed  ">
              {doc.bio ||
                "Dedicated clinical specialist with a focus on patient-centered outcomes. Extensively trained in advanced diagnostic methodologies and humanitarian clinical practices."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-slate-50">
              <div className="space-y-4">
                <h6 className=" font-bold text-slate-500 text-sm   font-grotesk">
                  Clinical Focus
                </h6>
                <ul className="space-y-3">
                  {(
                    doc.clinicalFocus || [
                      "Preventative Care",
                      "Diagnostic Excellence",
                      "Systemic Recovery",
                    ]
                  ).map((item: string) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-600  tracking-tight"
                    >
                      <BiCheckCircle className="text-emerald-500" size={16} />{" "}
                      <h1>{item}</h1>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h6 className=" font-bold text-slate-500 text-sm   font-grotesk">
                  Medical Aid Certified
                </h6>
                <div className="flex flex-wrap gap-2">
                  {(
                    doc.medicalAids || [
                      "Discovery",
                      "Bonitas",
                      "Momentum",
                      "Medishield",
                    ]
                  ).map((aid: string) => (
                    <Badge key={aid} label={aid} variant="soft" className="" />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* REVIEWS PREVIEW */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-500  tracking-normal px-2 font-grotesk">
              Patient Feedback
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {doc.reviews?.length > 0 ? (
                doc.reviews.map((rev: any, i: number) => (
                  <Card
                    key={i}
                    className="p-6 transition-all hover:border-primary/20"
                    variant="solid"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {rev.patientName?.charAt(0) || "P"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-none mb-1">
                            {rev.patientName}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold  tracking-normal">
                            {new Date(rev.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex text-amber-400 gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <BiStar
                            key={idx}
                            className={
                              idx < rev.rating
                                ? "fill-current"
                                : "text-slate-200"
                            }
                            size={12}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-500">
                    No patient feedback yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR: ACCESS & AVAILABILITY */}
        <div className="space-y-6">
          <div
            className="p-8 space-y-8 rounded-lg bg-slate-600 text-white  relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-1000">
              <BiCheckShield size={120} />
            </div>
            <div className="text-center relative z-10">
              <p className="text-xs font-bold text-slate-500  tracking-normal mb-4">
                Access Status
              </p>
              <h3 className="text-3xl font-bold tracking-tight font-grotesk">
                Premium Access
              </h3>
              <p className="text-xs text-emerald-400 font-bold  mt-3 tracking-normal flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Subscription Covered
              </p>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/10 relative z-10">
              <div className="flex items-start gap-4">
                <BiCheckShield
                  className="text-emerald-400 shrink-0 mt-1"
                  size={24}
                />
                <p className="text-sm font-medium  leading-relaxed tracking-normal text-slate-100">
                  Unlocked via your health premium. No consultation fees apply
                  for this session.
                </p>
              </div>
              <Button  onClick={() => setShowBooking(true)}>Schedule Now</Button>
            </div>
          </div>

          <Card className="p-6 space-y-6" variant="solid">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500  tracking-normal font-grotesk">
                Live Status
              </h4>
              <BiWorld
                className="text-primary/20 animate-spin-slow"
                size={24}
              />
            </div>
            <div className="space-y-3">
              {["09:00 AM", "10:30 AM", "11:45 AM", "02:00 PM"].map(
                (slot: string) => (
                  <div
                    key={slot}
                    className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100/50 group hover:border-primary/20 transition-all cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-600 tabular-nums">
                      {slot}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-500  tracking-normal opacity-0 group-hover:opacity-100 transition-opacity">
                      Available
                    </span>
                  </div>
                ),
              )}
            </div>
            <div className="flex items-center gap-2 justify-center py-2 border-t border-slate-50 pt-6">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-white bg-slate-200"
                  />
                ))}
              </div>
              <p className="text-[9px] text-slate-500 font-bold  tracking-normal">
                12 patients waiting
              </p>
            </div>
          </Card>
        </div>
      </div>

      <BookingModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        doctor={doc}
      />
    </div>
  );
}
