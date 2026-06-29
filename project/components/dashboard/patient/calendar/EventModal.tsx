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
import RefillForm from "./RefillForm";

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
  prescriptionId?: string;
  prescriptionName?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  pharmacyId?: string;
  paymentMethod?: "insurance" | "card" | "cash";
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
  facilityOptions: any[];
  loadingPrescriptions: boolean;
  prescriptionOptions: any[];
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
  facilityOptions,
  loadingPrescriptions,
  prescriptionOptions,
  isSaving,
  handleAddSubmit,
}) => {
  return (
    <Modal
      isOpen={!!showAddModal}
      onClose={onClose}
      title={`${editingId ? "Edit" : "Add"} ${
        addForm.type === "refill"
          ? "Refill"
          : addForm.type === "reminder"
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
              {
                label: "Appointment",
                value: "appointment",
                icon: <BiCalendar />,
              },
              { label: "Reminder", value: "reminder", icon: <BiTrendingUp /> },
              { label: "Refill", value: "refill", icon: <BiLoaderAlt /> },
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

          {addForm.type === "appointment" && (
            <>
              {doctors.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-600">
                    <BiUser size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900 font-grotesk">
                      No Practitioners Found
                    </p>
                    <p className="text-xs mb-4 text-gray-700 leading-relaxed">
                      You need to add a practitioner before you can schedule.
                    </p>
                  </div>
                  <Link href="/patient/doctors">
                    <Button variant={"outline"} size={"sm"}>
                      Browse Practitioners
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Input
                    label="Concern / Title"
                    type="text"
                    placeholder="e.g. Blood pressure check"
                    value={addForm.title}
                    onChange={(e) =>
                      setAddForm({ ...addForm, title: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Time"
                      type="time"
                      value={addForm.time}
                      onChange={(e) =>
                        setAddForm({ ...addForm, time: e.target.value })
                      }
                    />
                    <Select
                      label="Doctor"
                      value={addForm.doctor}
                      onChange={(v) => setAddForm({ ...addForm, doctor: v })}
                      options={doctorOptions}
                      icon={<BiUser />}
                    />
                  </div>
                  <Input
                    label="Notes"
                    textarea
                    placeholder="Any details or observations..."
                    value={addForm.notes}
                    onChange={(e) =>
                      setAddForm({ ...addForm, notes: e.target.value })
                    }
                  />
                </>
              )}
            </>
          )}

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

          {addForm.type === "refill" && (
            <RefillForm
              addForm={addForm}
              setAddForm={setAddForm}
              loadingPrescriptions={loadingPrescriptions}
              prescriptionOptions={prescriptionOptions}
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={
              isSaving ||
              (addForm.type === "appointment" && !addForm.title.trim())
            }
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
