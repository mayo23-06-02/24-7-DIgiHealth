'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BiSearch, BiPlus, BiDownload, BiEdit, BiTrash, BiLoaderAlt, BiX } from 'react-icons/bi';

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    userId: '',
    role: 'doctor',
    department: '',
    shiftStart: '08:00',
    shiftEnd: '16:00',
    hourlyRate: 0,
  });

  // Doctor Search State
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorResults, setDoctorResults] = useState<any[]>([]);
  const [isSearchingDoctor, setIsSearchingDoctor] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hospital/staff');
      const json = await res.json();
      if (json.success) setStaff(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Fetch doctors for searchable dropdown
  useEffect(() => {
    if (doctorSearch.length < 2 || selectedDoctor) {
      setDoctorResults([]);
      return;
    }

    const searchDoctors = async () => {
      setIsSearchingDoctor(true);
      try {
        const res = await fetch(`/api/hospital/doctors/search?search=${encodeURIComponent(doctorSearch)}`);
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
      alert('Please select a doctor/staff member');
      return;
    }

    setLoading(true);
    try {
      // Get facility ID first
      const facRes = await fetch('/api/hospital/facility');
      const facJson = await facRes.json();
      const facilityId = facJson.data?._id;

      const payload = {
        ...formData,
        facilityId,
        shiftSchedule: {
          start: formData.shiftStart,
          end: formData.shiftEnd,
          days: [1, 2, 3, 4, 5],
        },
      };

      const url = editingStaff ? `/api/hospital/staff/${editingStaff._id}` : '/api/hospital/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchStaff();
        resetForm();
      } else {
        alert(json.error || 'Failed to save staff');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      role: 'doctor',
      department: '',
      shiftStart: '08:00',
      shiftEnd: '16:00',
      hourlyRate: 0,
    });
    setDoctorSearch('');
    setSelectedDoctor(null);
    setEditingStaff(null);
  };

  const toggleDuty = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/hospital/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnDuty: !currentStatus })
      });
      const json = await res.json();
      if (json.success) {
        setStaff(staff.map(s => s._id === id ? json.data : s));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      const res = await fetch(`/api/hospital/staff/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setStaff(staff.filter(s => s._id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const exportCSV = () => {
    if (staff.length === 0) return;
    const headers = ['Role', 'Department', 'Shift Start', 'Shift End', 'On Duty', 'Hourly Rate'];
    const csvContent = [
      headers.join(','),
      ...staff.map(s => [
        s.role,
        s.department,
        s.shiftSchedule?.start,
        s.shiftSchedule?.end,
        s.isOnDuty,
        s.hourlyRate
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_list_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.userId && (s.userId.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.userId.lastName?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    return (matchesSearch || !searchTerm) && matchesRole;
  });

  return (
    <div className="w-full pb-10 flex flex-col gap-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
          <p className="text-sm text-slate-500">Manage facility personnel, schedules, and duty status</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportCSV} icon={<BiDownload size={18} />}>Export CSV</Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} icon={<BiPlus size={18} />}>Add Staff</Button>
        </div>
      </div>

      <Card className="min-h-[60vh] flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-sm">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="admin">Admin</option>
            <option value="technician">Technician</option>
          </select>
        </div>

        {loading ? (
           <div className="flex-1 flex items-center justify-center min-h-[400px]">
             <BiLoaderAlt className="animate-spin text-primary text-4xl" />
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name/User</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Shift</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">On Duty</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Rate</th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {filteredStaff.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-700">
                         {item.userId ? `${item.userId.firstName} ${item.userId.lastName}` : 'Unassigned User'}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.userId?.email || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        item.role === 'doctor' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        item.role === 'nurse' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      } border`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">{item.department}</td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {item.shiftSchedule?.start} - {item.shiftSchedule?.end}
                    </td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => toggleDuty(item._id, item.isOnDuty)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${item.isOnDuty ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${item.isOnDuty ? 'translate-x-5' : 'translate-x-0'}`}></span>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 font-medium">R {item.hourlyRate}/hr</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { 
                            setEditingStaff(item); 
                            setFormData({
                              userId: item.userId?._id || '',
                              role: item.role,
                              department: item.department,
                              shiftStart: item.shiftSchedule?.start || '08:00',
                              shiftEnd: item.shiftSchedule?.end || '16:00',
                              hourlyRate: item.hourlyRate,
                            });
                            setSelectedDoctor(item.userId);
                            setDoctorSearch(item.userId ? `${item.userId.firstName} ${item.userId.lastName}` : '');
                            setIsModalOpen(true); 
                          }} 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors"
                        >
                          <BiEdit size={18} />
                        </button>
                        <button onClick={() => handleDelete(item._id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                          <BiTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No staff found matching criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 flex flex-col gap-4">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</h2>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><BiX size={24} /></button>
             </div>
             
             <div className="space-y-4">
                {/* Doctor Search Dropdown */}
                {!editingStaff && (
                  <div className="relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Registered Practitioner</label>
                    <div className="relative mt-1">
                      <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={doctorSearch}
                        onChange={(e) => {
                          setDoctorSearch(e.target.value);
                          if (selectedDoctor) {
                            setSelectedDoctor(null);
                            setFormData({...formData, userId: ''});
                          }
                          setShowDoctorDropdown(true);
                        }}
                        onFocus={() => setShowDoctorDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"
                      />
                      {isSearchingDoctor && (
                        <BiLoaderAlt className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" size={16} />
                      )}
                    </div>

                    {showDoctorDropdown && doctorResults.length > 0 && !selectedDoctor && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                        {doctorResults.map((dr) => (
                          <button
                            key={dr._id}
                            type="button"
                            onClick={() => {
                              setSelectedDoctor(dr);
                              setDoctorSearch(`${dr.firstName} ${dr.lastName}`);
                              setFormData({...formData, userId: dr._id});
                              setShowDoctorDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col border-b border-slate-50 last:border-0"
                          >
                            <span className="text-sm font-bold text-slate-700">{dr.firstName} {dr.lastName}</span>
                            <span className="text-[10px] text-slate-400">{dr.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editingStaff && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Member</label>
                    <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-700">
                      {editingStaff.userId ? `${editingStaff.userId.firstName} ${editingStaff.userId.lastName}` : 'Unassigned'}
                    </div>
                  </div>
                )}

               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                 <select 
                   className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                   value={formData.role}
                   onChange={e => setFormData({...formData, role: e.target.value})}
                 >
                   <option value="doctor">Doctor</option>
                   <option value="nurse">Nurse</option>
                   <option value="admin">Admin</option>
                   <option value="technician">Technician</option>
                 </select>
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                 <input 
                   type="text" 
                   className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                   value={formData.department}
                   onChange={e => setFormData({...formData, department: e.target.value})}
                   placeholder="e.g. Cardiology" 
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Start</label>
                   <input 
                    type="time" 
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                    value={formData.shiftStart}
                    onChange={e => setFormData({...formData, shiftStart: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift End</label>
                   <input 
                    type="time" 
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                    value={formData.shiftEnd}
                    onChange={e => setFormData({...formData, shiftEnd: e.target.value})}
                   />
                 </div>
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hourly Rate (ZAR)</label>
                 <input 
                   type="number" 
                   className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" 
                   value={formData.hourlyRate}
                   onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})}
                 />
               </div>
             </div>

             <div className="mt-6 flex justify-end gap-3">
               <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</Button>
               <Button onClick={handleSaveStaff} loading={loading}>
                 {editingStaff ? 'Update Staff Member' : 'Add to Staff'}
               </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
