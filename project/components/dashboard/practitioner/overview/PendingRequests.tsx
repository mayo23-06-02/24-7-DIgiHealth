import React from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { PendingRequest } from './types';

interface PendingRequestsProps {
  requests: PendingRequest[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  actionLoading: string | null;
}

export default function PendingRequests({
  requests,
  onAccept,
  onDecline,
  actionLoading,
}: PendingRequestsProps) {
  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium text-sm bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
        No pending requests
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((req) => (
        <div
          key={req.consultationId}
          className="p-5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors shadow-none shadow-slate-100/50 cursor-pointer"
        >
          <div className="flex items-start gap-4 mb-4">
            <Avatar name={req.patientName} size="md" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-slate-800 leading-none font-grotesk">
                  {req.patientName}
                </h4>
                {new Date(req.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    New
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                {new Date(req.scheduledStart).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <p className="text-xs font-bold text-slate-500 capitalize">{req.type} Consultation</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDecline(req.consultationId);
              }}
              loading={actionLoading === req.consultationId}
              className="flex-1 text-rose-500 bg-rose-50 hover:bg-rose-100 min-w-[80px]"
            >
              Decline
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                toast('Reschedule functionality coming soon. Please message the patient.');
              }}
              className="flex-1 text-slate-500 min-w-[80px]"
            >
              Reschedule
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAccept(req.consultationId);
              }}
              loading={actionLoading === req.consultationId}
              className="flex-1 min-w-[80px]"
            >
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}