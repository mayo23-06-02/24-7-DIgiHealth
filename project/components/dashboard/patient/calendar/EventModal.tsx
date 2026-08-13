import React from "react";
import {
  BiCalendar,
  BiTrendingUp,
  BiLoaderAlt,
  BiPencil,
  BiTrash,
  BiUser,
  BiBuilding,
  BiPlus,
} from "react-icons/bi";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Link from "next/link";

interface Appointment {
  id: string;
  title?: string;
  dr?: string;
  dr_specialty?: string;
  time: string;
  date: string;
  type: "appointment" | "reminder" | "note" | "refill";
  status: "confirmed" | "pending" | "cancelled";
  concern?: string;
  notes?: string;
  location?: string;
  institution?: string;
  img?: string;
  countdown?: string;
  durationMinutes?: number;
  reminderDays?: number;
}

interface EventModalProps {
  showAddModal: string | null;
  onClose: () => void;
  editingId: string | null;
  addForm: any;
  setAddForm: (form: any) => void;
  appointments: Appointment[];
  getMarkerColor: (type: string) => string;
  onDragStart: (e: React.DragEvent, apptId: string) => void;
  handleEdit: (appt: Appointment) => void;
  handleDelete: (appt: Appointment) => void;
  doctors: any[];
  doctorOptions: any[];
  isSaving: boolean;
  handleAddSubmit: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
  showAddModal,
  onClose,
  editingId,
  addForm,
  setAddForm,
  appointments,
  getMarkerColor,
  onDragStart,
  handleEdit,
  handleDelete,
  doctors,
  doctorOptions,
  isSaving,
  handleAddSubmit,
}) => {
  return (
    <Modal
      isOpen={!!showAddModal}
      onClose={onClose}
      title={`${editingId ? "Edit" : "Add"} ${
        addForm.type === "reminder"
          ? "Reminder"
          : addForm.type === "note"
            ? "Note"
            : "Appointment"
      } — ${
        showAddModal
          ? new Date(showAddModal).toLocaleDateString("en-ZA", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
          : ""
      }`}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-slate-600 font-semibold tracking-normal">
            {editingId ? "Modify Selection" : "Add New Event"}
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Reminder", value: "reminder", icon: <BiTrendingUp /> },
              { label: "Note", value: "note", icon: <BiPencil /> },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAddForm({ ...addForm, type: opt.value })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  addForm.type === opt.value
                    ? "bg-primary text-white border-primary shadow-none shadow-primary/20"
                    : "bg-white text-slate-500 border-slate-200 hover:border-primary/50"
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {addForm.type === "reminder" && (
            <>
              <Input
                label="Reminder Title"
                type="text"
                placeholder="e.g. Take medication"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm({ ...addForm, title: e.target.value })
                }
              />
              <Input
                label="Time"
                type="time"
                value={addForm.time}
                onChange={(e) =>
                  setAddForm({ ...addForm, time: e.target.value })
                }
              />
              <Input
                label="Notes (optional)"
                textarea
                placeholder="Additional info..."
                value={addForm.notes}
                onChange={(e) =>
                  setAddForm({ ...addForm, notes: e.target.value })
                }
              />
            </>
          )}

          {addForm.type === "note" && (
            <>
              <Input
                label="Note Title"
                type="text"
                placeholder="e.g. Blood pressure reading"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm({ ...addForm, title: e.target.value })
                }
              />
              <Input
                label="Note Content"
                textarea
                placeholder="Write your note here..."
                value={addForm.notes}
                onChange={(e) =>
                  setAddForm({ ...addForm, notes: e.target.value })
                }
              />
            </>
          )}

        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={isSaving || !addForm.title.trim()}
            onClick={handleAddSubmit}
          >
            {isSaving ? (
              <BiLoaderAlt className="animate-spin mr-2" />
            ) : editingId ? (
              <BiPencil className="mr-2" />
            ) : (
              <BiPlus className="mr-2" />
            )}
            {editingId ? "Update Event" : "Save Event"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EventModal;
