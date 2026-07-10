"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import BookingModal from "@/components/doctor/BookingModal";
import type { BookingParticipant } from "@/lib/booking";
import { BiCalendarPlus } from "react-icons/bi";

/**
 * Drop-in button that opens the unified booking modal.
 * Use on any page without re-implementing booking UI.
 */
export default function BookingTrigger({
  mode = "patient",
  doctor,
  patient,
  label = "Book appointment",
  className,
  onSuccess,
  variant = "primary",
}: {
  mode?: "patient" | "practitioner";
  doctor?: BookingParticipant | null;
  patient?: BookingParticipant | null;
  label?: string;
  className?: string;
  onSuccess?: () => void;
  variant?: "primary" | "ghost" | "white";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant as any}
        className={className}
        onClick={() => setOpen(true)}
        icon={<BiCalendarPlus size={18} />}
        iconPosition="left"
      >
        {label}
      </Button>
      <BookingModal
        isOpen={open}
        onClose={() => setOpen(false)}
        mode={mode}
        doctor={doctor as any}
        patient={patient as any}
        onSuccess={() => {
          setOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
}
