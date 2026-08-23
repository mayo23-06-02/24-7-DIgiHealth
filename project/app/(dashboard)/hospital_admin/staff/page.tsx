"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  Loader2,
  User,
  Mail,
  X,
  Users,
  Stethoscope,
  Clock,
  Calendar,
  DollarSign,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

// Helper to format invite expiry
function formatInviteExpiry(expiresAt: string): { label: string; expired: boolean } {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) {
    const minsAgo = Math.round(Math.abs(diffMs) / 60000);
    return { label: minsAgo <= 0 ? "Expired just now" : `Expired ${minsAgo} min ago`, expired: true };
  }
  const minsLeft = Math.round(diffMs / 60000);
  return { label: minsLeft <= 0 ? "Expires in <1 min" : `Expires in ${minsLeft} min`, expired: false };
}

const DEPARTMENTS = [
  "General Practitioner",
  "Paediatrician",
  "Cardiologist",
  "Dermatologist",
  "Psychiatrist",
  "Gynaecologist",
  "Neurologist",
  "Radiologist",
  "Surgeon",
  "Ophthalmologist",
];

interface StaffMember {
  _id: string;
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  role: string;
  department: string;
  shiftSchedule?: {
    start: string;
    end: string;
  };
  isOnDuty: boolean;
  hourlyRate: number | string;
  _doctorData?: any;
}

// KPI Card component
function KpiCard({ icon: Icon, label, value, subtext, color = "primary" }: any) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-full bg-${color}-50 flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div>
        <p className="text-xs font-bold text-ink-600 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-ink-900 font-grotesk">{value}</p>
        {subtext && <p className="text-xs text-ink-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

export default function StaffManagement() {
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [addMode, setAddMode] = useState<"new" | "existing" | "invite">("new");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorResults, setDoctorResults] = useState<any[]>([]);
  const [isSearchingDoctor, setIsSearchingDoctor] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    userId: "",
    role: "doctor",
    department: "General Practitioner",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    hourlyRate: 0,
  });

  // Invite-by-email state
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Pending invites list
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  // Define table columns for staff (defined inside component to access state/functions)
  const staffColumns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Name/User",
      isTitle: true,
      render: (row) => (
        <div>
          <p className="text-sm font-bold text-ink-900">
            {row.userId ? `${row.userId.firstName || ''} ${row.userId.lastName || ''}`.trim() : "Unknown"}
          </p>
          <p className="text-xs text-ink-400">{row.userId?.email || "N/A"}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge
          label={row.role || 'doctor'}
          status={row.role === "doctor" ? "info" : "success"}
          size="sm"
          className="capitalize"
        />
      ),
    },
    {
      key: "department",
      header: "Department",
    },
    {
      key: "shift",
      header: "Shift",
      render: (row) => (
        <span className="text-xs text-ink-400">
          {row.shiftSchedule?.start || '—'} - {row.shiftSchedule?.end || '—'}
        </span>
      ),
    },
    {
      key: "onDuty",
      header: "On Duty",
      align: "center",
      render: (row) => {
        const isFallback = !!row._doctorData;
        return (
          <div className="flex flex-col items-center">
            <button
              onClick={() => toggleDuty(row._id, row.isOnDuty)}
              disabled={isFallback}
              aria-label={row.isOnDuty ? "Set off duty" : "Set on duty"}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                isFallback ? "opacity-50 cursor-not-allowed" : ""
              } ${row.isOnDuty ? "bg-success-500" : "bg-surface-soft"}`}
            >
              <span
                className={`absolute top-1 left-1 bg-surface w-3 h-3 rounded-full transition-transform ${row.isOnDuty ? "translate-x-5" : "translate-x-0"}`}
              ></span>
            </button>
          </div>
        );
      },
    },
    {
      key: "rate",
      header: "Rate",
      render: (row) => (
        <span className="text-sm text-ink-600 font-medium">
          {row.hourlyRate !== '—' ? `R ${row.hourlyRate}/hr` : '—'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => {
        const isFallback = !!row._doctorData;
        return (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                if (row._id) {
                  router.push(`/hospital_admin/staff/${row._id}`);
                }
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-surface-soft hover:text-primary-500 transition-colors"
              title="View Profile"
              aria-label="View profile"
            >
              <User size={18} />
            </button>
            {!isFallback && (
              <>
                <button
                  onClick={() => {
                    setEditingStaff(row);
                    setFormData({
                      userId: row.userId?._id || "",
                      role: row.role,
                      department: row.department,
                      shiftStart: row.shiftSchedule?.start || "08:00",
                      shiftEnd: row.shiftSchedule?.end || "16:00",
                      // ✅ Fix: ensure hourlyRate is a number, default to 0 if not a number
                      hourlyRate: typeof row.hourlyRate === 'number' ? row.hourlyRate : 0,
                    });
                    setSelectedDoctor(row.userId);
                    setDoctorSearch(
                      row.userId
                        ? `${row.userId.firstName} ${row.userId.lastName}`
                        : "",
                    );
                    setIsModalOpen(true);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-surface-soft hover:text-primary-500 transition-colors"
                  title="Edit"
                  aria-label="Edit staff"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(row._id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-danger-50 hover:text-danger-500 transition-colors"
                  title="Remove"
                  aria-label="Remove staff"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hospital/staff");
      const json = await res.json();
      if (json.success) setStaff(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch("/api/hospital/dashboard");
      const json = await res.json();
      if (json.success) setDashboard(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch("/api/hospital/staff/invite");
      const json = await res.json();
      if (json.success) setPendingInvites(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDashboard();
    fetchInvites();
  }, []);

  // If staff is empty but dashboard has doctors, use dashboard doctors as fallback
  useEffect(() => {
    if (!loading && staff.length === 0 && dashboard && dashboard.doctors?.length > 0) {
      // Map dashboard doctors to staff-like objects for display
      const fallbackStaff = dashboard.doctors.map((doc: any) => ({
        _id: doc.id,
        userId: {
          _id: doc.id,
          firstName: doc.name.replace(/^Dr\.\s*/, '').split(' ')[0] || '',
          lastName: doc.name.replace(/^Dr\.\s*/, '').split(' ').slice(1).join(' ') || '',
          email: doc.email || '',
        },
        role: 'doctor',
        department: doc.department || doc.specialisation || 'General',
        isOnDuty: doc.isOnDuty,
        shiftSchedule: { start: '—', end: '—' },
        hourlyRate: '—',
        // Keep original doctor data for actions
        _doctorData: doc,
      }));
      setStaff(fallbackStaff);
    }
  }, [loading, staff, dashboard]);

  // Fetch doctors for searchable dropdown
  useEffect(() => {
    if (doctorSearch.length < 2 || selectedDoctor) {
      setDoctorResults([]);
      return;
    }

    const searchDoctors = async () => {
      setIsSearchingDoctor(true);
      try {
        const res = await fetch(
          `/api/hospital/doctors/search?search=${encodeURIComponent(doctorSearch)}`,
        );
        const json = await res.json();
        if (json.success) setDoctorResults(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingDoctor(false);
      }
    };

    const debounce = setTimeout(searchDoctors, 300);
    return () => clearTimeout(debounce);
  }, [doctorSearch, selectedDoctor]);

  const handleSaveStaff = async () => {
    if (!formData.userId && !editingStaff) {
      alert("Please select a doctor/staff member");
      return;
    }

    setLoading(true);
    try {
      if (editingStaff) {
        const payload = {
          ...formData,
          shiftSchedule: {
            start: formData.shiftStart,
            end: formData.shiftEnd,
            days: [1, 2, 3, 4, 5],
          },
        };

        const res = await fetch(`/api/hospital/staff/${editingStaff._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          fetchStaff();
          resetForm();
        } else {
          alert(json.error || "Failed to update staff");
        }
      } else {
        const res = await fetch("/api/hospital/staff/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: formData.userId,
            department: formData.department,
            shiftStart: formData.shiftStart,
            shiftEnd: formData.shiftEnd,
            hourlyRate: formData.hourlyRate,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setIsModalOpen(false);
          resetForm();
          alert(`Approval request sent to ${json.data.email}. The doctor will receive an email to approve the facility link.`);
        } else {
          alert(json.error || "Failed to send approval request");
        }
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("Enter the doctor's email address");
      return;
    }
    setIsSendingInvite(true);
    setInviteError("");
    try {
      const res = await fetch("/api/hospital/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          hourlyRate: formData.hourlyRate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        resetForm();
        fetchInvites();
      } else {
        setInviteError(json.error || "Failed to send invite");
      }
    } catch (e) {
      console.error(e);
      setInviteError("An error occurred while sending the invite");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    setCancellingInviteId(id);
    try {
      const res = await fetch(`/api/hospital/staff/invite/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setPendingInvites((prev) => prev.filter((i) => i._id !== id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCancellingInviteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      role: "doctor",
      department: "",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      hourlyRate: 0,
    });
    setDoctorSearch("");
    setSelectedDoctor(null);
    setEditingStaff(null);
    setAddMode("existing");
    setInviteEmail("");
    setInviteError("");
  };

  const toggleDuty = async (id: string, currentStatus: boolean) => {
    // If this is a fallback doctor (no staffId), we can't update via staff API
    const isFallback = staff.some(s => s._id === id && s._doctorData);
    if (isFallback) {
      alert("This doctor is not linked as staff yet. Add them to staff to manage duty status.");
      return;
    }
    try {
      const res = await fetch(`/api/hospital/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnDuty: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setStaff(staff.map((s) => (s._id === id ? json.data : s)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    const isFallback = staff.some(s => s._id === id && s._doctorData);
    if (isFallback) {
      alert("This doctor is not linked as staff. Add them to staff to enable removal.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this staff member?"))
      return;
    try {
      const res = await fetch(`/api/hospital/staff/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setStaff(staff.filter((s) => s._id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const exportCSV = () => {
    if (staff.length === 0) return;
    const headers = [
      "Name",
      "Role",
      "Department",
      "Shift Start",
      "Shift End",
      "On Duty",
      "Hourly Rate",
    ];
    const csvContent = [
      headers.join(","),
      ...staff.map((s) => {
        const name = s.userId ? `${s.userId.firstName} ${s.userId.lastName}` : "Unknown";
        return [
          name,
          s.role,
          s.department,
          s.shiftSchedule?.start || '—',
          s.shiftSchedule?.end || '—',
          s.isOnDuty ? "Yes" : "No",
          s.hourlyRate,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff_list_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredStaff = staff.filter((s) => {
    if (!s.userId) return false;
    const fullName = `${s.userId.firstName || ''} ${s.userId.lastName || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || !searchTerm;
  });

  return (
    <div className="w-full pb-10 flex flex-col gap-6 relative">
      {/* Header */}
      <div className="flex px-4 lg:px-0 flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-2xl font-bold text-slate-800 font-grotesk">
            Staff Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage facility personnel, schedules, and duty status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            Add Staff
          </Button>
        </div>
      </div>

      {/* Pending invites */}
      {!loadingInvites && pendingInvites.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-warning-50 flex items-center gap-2">
            <Mail className="text-warning-700" size={16} />
            <h2 className="text-sm font-bold text-slate-700">
              Pending Invites ({pendingInvites.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingInvites.map((invite) => {
              const expiry = formatInviteExpiry(invite.expiresAt);
              return (
                <div
                  key={invite._id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {invite.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {expiry.expired ? "" : expiry.label}
                      </p>
                    </div>
                    {expiry.expired && (
                      <Badge label={expiry.label} status="error" size="sm" />
                    )}
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite._id)}
                    disabled={cancellingInviteId === invite._id}
                    className="flex items-center gap-1 text-xs font-bold text-danger-500 hover:text-danger-700 border border-danger-500/30 px-2 py-1 rounded-lg hover:bg-danger-50 transition-colors disabled:opacity-50"
                  >
                    {cancellingInviteId === invite._id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <X size={14} />
                    )}
                    Cancel
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Staff Table */}
      <Card className="min-h-[60vh] flex flex-col p-0 overflow-hidden">
        <div className="py-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-sm">
            <Input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-primary text-4xl" />
          </div>
        ) : (
          <Table columns={staffColumns} data={filteredStaff} keyField="_id" />
        )}
      </Card>

      {/* Add/Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingStaff ? "Edit Staff Member" : "Add Staff Member"}
      >
        <div className="space-y-5">
          {/* Existing vs. Invite toggle — only when adding */}
          {!editingStaff && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setAddMode("existing")}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${
                  addMode === "existing"
                    ? "bg-white text-primary shadow-none"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Existing Doctor
              </button>
              <button
                type="button"
                onClick={() => setAddMode("invite")}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${
                  addMode === "invite"
                    ? "bg-white text-primary shadow-none"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Invite New Doctor
              </button>
            </div>
          )}

          {/* Doctor Search — existing doctor, add-only */}
          {!editingStaff && addMode === "existing" && (
            <div className="relative">
              <Input
                label="Select Registered Practitioner"
                type="text"
                placeholder="Search by name or email..."
                value={doctorSearch}
                onChange={(e) => {
                  setDoctorSearch(e.target.value);
                  if (selectedDoctor) {
                    setSelectedDoctor(null);
                    setFormData({ ...formData, userId: "" });
                  }
                  setShowDoctorDropdown(true);
                }}
                onFocus={() => setShowDoctorDropdown(true)}
                icon={<Search size={16} />}
              />

              {showDoctorDropdown &&
                !selectedDoctor &&
                (isSearchingDoctor || doctorResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg z-50 max-h-48 overflow-y-auto">
                    {isSearchingDoctor && (
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
                        <Loader2 className="animate-spin text-primary" size={16} />
                        Searching...
                      </div>
                    )}
                    {!isSearchingDoctor && doctorResults.map((dr) => (
                      <button
                        key={dr._id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctor(dr);
                          setDoctorSearch(`${dr.firstName} ${dr.lastName}`);
                          setFormData({
                            ...formData,
                            userId: dr._id,
                            department: dr.specialisation || formData.department,
                          });
                          setShowDoctorDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <span className="text-sm font-bold text-slate-700">
                          {dr.firstName} {dr.lastName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {dr.email}
                          {dr.specialisation ? ` · ${dr.specialisation}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Invite by email — add-only */}
          {!editingStaff && addMode === "invite" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
                <Mail className="text-primary shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-slate-600 leading-relaxed">
                  We'll email them a registration link, valid for{" "}
                  <span className="font-bold">15 minutes</span>. They complete
                  their own practitioner profile (specialisation, HPCSA number,
                  credentials) and get added to your roster automatically once
                  they finish.
                </p>
              </div>
              <Input
                label="Doctor's Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                placeholder="doctor@example.com"
                error={inviteError || undefined}
              />
            </div>
          )}

          {/* Read-only name when editing */}
          {editingStaff && (
            <div>
              <label className="block text-xs font-bold text-slate-500 tracking-wider mb-1 uppercase">
                Staff Member
              </label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-700">
                {editingStaff.userId
                  ? `${editingStaff.userId.firstName} ${editingStaff.userId.lastName}`
                  : "Unassigned"}
              </div>
            </div>
          )}

          {/* Department */}
          {(editingStaff || addMode === "existing") && (
            <Select
              label="Department"
              value={formData.department}
              onChange={(value) => setFormData({ ...formData, department: value })}
              options={[
                { value: "", label: "-- Select department --" },
                ...[
                  ...DEPARTMENTS,
                  ...(formData.department && !DEPARTMENTS.includes(formData.department)
                    ? [formData.department]
                    : []),
                ].map((d) => ({ value: d, label: d })),
              ]}
            />
          )}

          {/* Shift */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Shift Start"
              type="time"
              value={formData.shiftStart}
              onChange={(e) =>
                setFormData({ ...formData, shiftStart: e.target.value })
              }
            />
            <Input
              label="Shift End"
              type="time"
              value={formData.shiftEnd}
              onChange={(e) =>
                setFormData({ ...formData, shiftEnd: e.target.value })
              }
            />
          </div>

          {/* Hourly Rate */}
          <Input
            label="Hourly Rate (ZAR)"
            type="number"
            value={formData.hourlyRate}
            onChange={(e) =>
              setFormData({ ...formData, hourlyRate: Number(e.target.value) })
            }
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            {!editingStaff && addMode === "invite" ? (
              <Button
                onClick={handleSendInvite}
                disabled={isSendingInvite}
                icon={isSendingInvite ? <Loader2 className="animate-spin" /> : <Mail />}
                iconPosition="left"
              >
                {isSendingInvite ? "Sending..." : "Send Invite"}
              </Button>
            ) : (
              <Button onClick={handleSaveStaff} loading={loading}>
                {editingStaff ? "Update Staff Member" : "Add to Staff"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}