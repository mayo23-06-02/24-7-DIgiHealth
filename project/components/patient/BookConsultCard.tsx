"use client";
import React, { useState } from 'react';
import { patientApi } from '../../services/patientApi';
import { FiVideo, FiCalendar, FiClock } from 'react-icons/fi';

export default function BookConsultCard({ isOnline, pushToQueue }: { isOnline: boolean; pushToQueue: any }) {
  const [bookingStatus, setBookingStatus] = useState<'idle'|'loading'|'success'>('idle');

  const handleBook = async () => {
    setBookingStatus('loading');
    if (!isOnline) {
       // Queued to offline sync
       pushToQueue('BOOK_CONSULT', { timestamp: Date.now(), doctor: "Next Available" });
       setTimeout(() => setBookingStatus('success'), 600);
       return;
    }

    try {
      await patientApi.bookConsultation();
      setBookingStatus('success');
    } catch {
      setBookingStatus('idle'); // Would handle err in real app
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
      <div className="flex items-center gap-4 mb-6">
         <div className="w-12 h-12 rounded-full bg-supportive-teal/10 text-supportive-teal flex items-center justify-center text-2xl">
           <FiVideo />
         </div>
         <h3 className="text-2xl font-bold text-slate-800">Virtual Care</h3>
      </div>
      
      <p className="text-slate-600 font-medium mb-8">Connect with an HPCSA registered doctor immediately via secure video call.</p>
      
      {bookingStatus === 'success' ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 animate-reveal">
          <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl shadow-md">✓</div>
          <p className="font-bold text-center">{isOnline ? "Consultation booked!" : "Saved offline. Will book when connected."}</p>
          {isOnline && <p className="text-sm text-center">You will be notified when the doctor is ready.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={handleBook}
            disabled={bookingStatus === 'loading'}
            className="w-full py-4 rounded-full bg-supportive-teal text-white font-bold text-lg hover:bg-teal-600 transition-colors shadow-md shadow-supportive-teal/30 hover:scale-[1.02] flex justify-center items-center h-[60px]"
          >
            {bookingStatus === 'loading' ? (
              <span className="animate-pulse">Preparing Virtual Room...</span>
            ) : (
              "See a Doctor Now"
            )}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 py-3 rounded-full border border-slate-100">
            <FiClock className="text-trust-blue" /> Next available: <strong className="text-slate-800">Dr. Mokoena (GP) – 2 mins</strong>
          </div>

          <button className="w-full py-3 text-trust-blue font-bold flex justify-center items-center gap-2 hover:bg-slate-50 rounded-full transition-colors mt-2">
            <FiCalendar /> Schedule for Later
          </button>
        </div>
      )}
    </div>
  );
}
