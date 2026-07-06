import React from "react";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

interface DoctorsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    specialization: string;
    language: string;
    location: string;
  };
  setFilters: (filters: any) => void;
  uniqueSpecializations: string[];
  allProvinces: string[];
  allLanguages: string[];
}

export default function DoctorsFilterModal({
  isOpen,
  onClose,
  filters,
  setFilters,
  uniqueSpecializations,
  allProvinces,
  allLanguages,
}: DoctorsFilterModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filter Practitioners">
      <div className="space-y-6">
        <Select
          label="Specialization"
          options={[
            { label: "All Specializations", value: "" },
            ...uniqueSpecializations.map((s) => ({
              label: String(s),
              value: String(s),
            })),
          ]}
          value={filters.specialization}
          onChange={(v) => setFilters({ ...filters, specialization: v })}
        />
        <Select
          label="Province / Location"
          options={[
            { label: "Anywhere", value: "" },
            ...allProvinces.map((p) => ({
              label: String(p),
              value: String(p),
            })),
          ]}
          value={filters.location}
          onChange={(v) => setFilters({ ...filters, location: v })}
        />
        <Select
          label="Language"
          options={[
            { label: "Any Language", value: "" },
            ...allLanguages.map((l) => ({ label: l, value: l })),
          ]}
          value={filters.language}
          onChange={(v) => setFilters({ ...filters, language: v })}
        />
        <div className="flex gap-4 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setFilters({
                specialization: "",
                language: "",
                location: "",
              });
            }}
          >
            Clear Filters
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </div>
    </Modal>
  );
}
