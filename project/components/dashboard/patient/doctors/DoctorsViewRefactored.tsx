"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "@/hooks/useNavigate";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import { BiSearch, BiLoaderAlt } from "react-icons/bi";
import DoctorProfileModal from "@/components/dashboard/patient/DoctorProfileModal";
import BookingModal from "@/components/doctor/BookingModal";
import DoctorsSearchHeader from "./DoctorsSearchHeader";
import DoctorsFilterModal from "./DoctorsFilterModal";
import DoctorsSortModal from "./DoctorsSortModal";
import DoctorsCarouselSection from "./DoctorsCarouselSection";

export default function DoctorsViewRefactored() {
  const { navigate } = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [myDoctors, setMyDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [filters, setFilters] = useState({ specialization: "", language: "", location: "" });
  
  // Modal states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resAll, resMy] = await Promise.all([
        fetch("/api/patient/practitioners"),
        fetch("/api/patient/my-doctors"),
      ]);
      if (resAll.ok) setDoctors(await resAll.json());
      if (resMy.ok) setMyDoctors(await resMy.json());
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const searchTerms = searchQuery.toLowerCase();
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerms) ||
        doc.specialisation?.toLowerCase().includes(searchTerms) ||
        doc.about?.toLowerCase().includes(searchTerms) ||
        doc.location?.toLowerCase().includes(searchTerms);

      const matchesSpec = !filters.specialization || doc.specialisation === filters.specialization;
      const matchesLang = !filters.language || doc.languages?.includes(filters.language);
      const matchesLoc = !filters.location || doc.location === filters.location;

      return matchesSearch && matchesSpec && matchesLang && matchesLoc;
    });
  }, [doctors, searchQuery, filters]);

  const uniqueSpecializations = [...new Set(doctors.map((d) => d.specialisation).filter(Boolean))];
  const allProvinces = [...new Set(doctors.map((d) => d.location).filter(Boolean))];
  const allLanguages = [...new Set(["English", "Afrikaans", "Zulu", "Xhosa", "Sotho"].concat(doctors.flatMap((d) => d.languages || [])))];
  
  const hasActiveFilters = !!(filters.specialization || filters.language || filters.location);

  // Categories
  const randomizedDoctors = useMemo(() => [...filteredDoctors].sort(() => 0.5 - Math.random()), [filteredDoctors]);
  const generalPractitioners = useMemo(() => filteredDoctors.filter(d => d.specialisation?.toLowerCase().includes("general")), [filteredDoctors]);
  const popularDoctors = useMemo(() => [...filteredDoctors].sort((a, b) => (b.rating || 0) - (a.rating || 0)), [filteredDoctors]);

  const handleStartMessage = async (doc: any) => {
    if (!doc?.id) return;
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
      const conversationId = data?.conversationId;
      if (conversationId) {
        navigate(`/patient/messages?chatId=${conversationId}`);
      } else {
        navigate(`/patient/messages?doctorId=${doc.id}`);
      }
    } catch {
      navigate(`/patient/messages?doctorId=${doc.id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <PageHeader title="Clinical Practitioners" subtitle="Find and book appointments with verified practitioners." />

      <DoctorsSearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenFilter={() => setIsFilterModalOpen(true)}
        onOpenSort={() => setIsSortModalOpen(true)}
        hasActiveFilters={hasActiveFilters}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><BiLoaderAlt size={40} className="text-primary animate-spin" /></div>
      ) : filteredDoctors.length === 0 ? (
        <Card>
          <EmptyState title="No Practitioners Found" description="Try adjusting your search or filters." icon={<BiSearch size={32} />} actionLabel="Clear Filters" onAction={() => { setSearchQuery(""); setFilters({ specialization: "", language: "", location: "" }); }} />
        </Card>
      ) : (
        <div className="space-y-12">
          {myDoctors.length > 0 && !searchQuery && !hasActiveFilters && (
            <DoctorsCarouselSection title="My Doctors" doctors={myDoctors} onBook={(doc) => { setSelectedDoctor(doc); setIsBookingModalOpen(true); }} onMessage={handleStartMessage} />
          )}
          <DoctorsCarouselSection title="All Practitioners" doctors={randomizedDoctors} onBook={(doc) => { setSelectedDoctor(doc); setIsBookingModalOpen(true); }} onMessage={handleStartMessage} />
          {generalPractitioners.length > 0 && (
            <DoctorsCarouselSection title="General Practitioners" doctors={generalPractitioners} onBook={(doc) => { setSelectedDoctor(doc); setIsBookingModalOpen(true); }} onMessage={handleStartMessage} />
          )}
          <DoctorsCarouselSection title="Most Popular" doctors={popularDoctors} onBook={(doc) => { setSelectedDoctor(doc); setIsBookingModalOpen(true); }} onMessage={handleStartMessage} />
        </div>
      )}

      {/* Modals */}
      <DoctorsFilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} filters={filters} setFilters={setFilters} uniqueSpecializations={uniqueSpecializations} allProvinces={allProvinces} allLanguages={allLanguages} />
      <DoctorsSortModal isOpen={isSortModalOpen} onClose={() => setIsSortModalOpen(false)} sortBy={sortBy} setSortBy={setSortBy} />
      
      <DoctorProfileModal isOpen={!!selectedDoctor && !isBookingModalOpen} onClose={() => setSelectedDoctor(null)} doctor={selectedDoctor} onBook={() => setIsBookingModalOpen(true)} onMessage={() => handleStartMessage(selectedDoctor)} onLink={() => {}} isMyDoctor={false} />
      <BookingModal isOpen={isBookingModalOpen} onClose={() => { setIsBookingModalOpen(false); setSelectedDoctor(null); }} doctor={selectedDoctor} onSuccess={() => { setIsBookingModalOpen(false); setSelectedDoctor(null); }} mode="patient" />
    </div>
  );
}
