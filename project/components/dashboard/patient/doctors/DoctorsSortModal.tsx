import React from "react";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

interface DoctorsSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: string;
  setSortBy: (val: string) => void;
}

export default function DoctorsSortModal({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
}: DoctorsSortModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sort Practitioners">
      <div className="space-y-6">
        <Select
          label="Sort By"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { label: "Top Rated", value: "rating" },
            { label: "Experience", value: "experience" },
          ]}
        />
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
