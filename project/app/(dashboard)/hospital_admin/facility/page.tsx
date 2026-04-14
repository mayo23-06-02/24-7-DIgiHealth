'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BiSave, BiLoaderAlt, BiImageAdd } from 'react-icons/bi';

export default function FacilitySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facility, setFacility] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'public',
    address: '',
    contactNo: '',
    email: '',
    totalBeds: 0,
    icuBeds: 0,
    emergencyBeds: 0,
    open24Hours: false,
    services: { emergency: false, radiology: false, pharmacy: false }
  });

  const fetchFacility = async () => {
    try {
      const res = await fetch('/api/hospital/facility');
      const json = await res.json();
      if (json.success && json.data) {
        setFacility(json.data);
        setFormData({
          name: json.data.name || '',
          type: json.data.type || 'public',
          address: json.data.location?.address || '',
          contactNo: json.data.contactNo || '',
          email: json.data.email || '',
          totalBeds: json.data.bedCapacity?.total || 0,
          icuBeds: json.data.bedCapacity?.icu || 0,
          emergencyBeds: json.data.bedCapacity?.emergency || 0,
          open24Hours: json.data.operatingHours?.open24Hours || false,
          services: json.data.services || { emergency: false, radiology: false, pharmacy: false }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacility();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name in formData.services) {
        setFormData({ ...formData, services: { ...formData.services, [name]: checked } });
      } else {
        setFormData({ ...formData, [name]: checked });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const saveFacility = async () => {
    setSaving(true);
    try {
      const body = {
        _id: facility._id,
        name: formData.name,
        type: formData.type,
        location: { ...facility.location, address: formData.address },
        contactNo: formData.contactNo,
        email: formData.email,
        bedCapacity: { total: formData.totalBeds, icu: formData.icuBeds, emergency: formData.emergencyBeds },
        operatingHours: { open24Hours: formData.open24Hours },
        services: formData.services
      };

      const res = await fetch('/api/hospital/facility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        alert('Facility details saved successfully.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <BiLoaderAlt className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  return (
    <div className="w-full pb-10 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facility Settings</h1>
          <p className="text-sm text-slate-500">Manage hospital details and capacities</p>
        </div>
        <Button onClick={saveFacility} disabled={saving} icon={saving ? <BiLoaderAlt className="animate-spin" /> : <BiSave size={18} />}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card className="flex flex-col gap-6">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">General Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Facility Name</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Facility Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="ngo">NGO</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Address</label>
            <input name="address" value={formData.address} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Contact Number</label>
            <input name="contactNo" value={formData.contactNo} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
            <input name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mt-4">Capacity & Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Total Beds</label>
            <input name="totalBeds" type="number" value={formData.totalBeds} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">ICU Beds</label>
            <input name="icuBeds" type="number" value={formData.icuBeds} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Emergency Beds</label>
            <input name="emergencyBeds" type="number" value={formData.emergencyBeds} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" name="open24Hours" checked={formData.open24Hours} onChange={handleChange} className="w-4 h-4 text-primary rounded border-slate-300" />
          <label className="text-sm font-bold text-slate-700">Open 24 Hours</label>
        </div>

        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mt-4">Services Offered</h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="emergency" checked={formData.services.emergency} onChange={handleChange} className="w-4 h-4 text-primary rounded border-slate-300" />
            <span className="text-sm text-slate-700">Emergency</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="radiology" checked={formData.services.radiology} onChange={handleChange} className="w-4 h-4 text-primary rounded border-slate-300" />
            <span className="text-sm text-slate-700">Radiology</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="pharmacy" checked={formData.services.pharmacy} onChange={handleChange} className="w-4 h-4 text-primary rounded border-slate-300" />
            <span className="text-sm text-slate-700">Pharmacy</span>
          </label>
        </div>

        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mt-4">Media</h3>
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200 hover:text-primary transition-colors">
             <BiImageAdd size={32} />
             <span className="text-xs font-bold mt-2">Upload Photo</span>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm text-slate-500">
             Upload a cover image representing your facility. Supported formats: .JPG, .PNG. Max size: 5MB.
          </div>
        </div>
      </Card>
    </div>
  );
}
