"use client";

import React from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function DepartmentExplore() {
  const departments = [
    { name: "Cardiologist", icon: "❤️", color: "bg-rose-50 text-rose-500", desc: "Heart & Vascular" },
    { name: "Dentist", icon: "🦷", color: "bg-teal-50 text-teal-600", desc: "Oral Health" },
    { name: "Neurologist", icon: "🧠", color: "bg-purple-50 text-purple-600", desc: "Brain & Nerves" },
    { name: "Psychologist", icon: "☀️", color: "bg-amber-50 text-amber-600", desc: "Mental Health" },
    { name: "Orthopedic", icon: "🦴", color: "bg-slate-50 text-slate-600", desc: "Bones & Joints" },
    { name: "Gastro", icon: "🧪", color: "bg-blue-50 text-blue-600", desc: "Digestive System" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Explore <span className="text-primary">Departments</span></h2>
            <Badge label="52 Available" status="premium" variant="soft" />
         </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
         {departments.map(dept => (
           <Card key={dept.name} className="group text-center hover:scale-105" variant="solid">
              <div className={`w-20 h-20 mx-auto rounded-[2rem] mb-6 flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform duration-500 ${dept.color}`}>{dept.icon}</div>
              <p className="font-bold text-slate-800 leading-tight mb-1">{dept.name}</p>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">{dept.desc}</p>
           </Card>
         ))}
      </div>
    </div>
  );
}
