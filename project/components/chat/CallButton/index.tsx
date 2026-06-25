"use client";
import React from "react";
import { BiVideo, BiPhoneCall, BiLoaderAlt } from "react-icons/bi";
import { CallButtonProps } from "./types";
import { useCallManagement } from "./useCallManagement";

const PATIENT_CALL_WINDOW_LEAD_MS = 4 * 60 * 1000;

export default function CallButton(props: CallButtonProps) {
  const {
    callActive,
    autoJoinAvailable,
    pendingRoomInfo,
    incomingAlertOpen,
    statusLoading,
    isCallWindowOpen,
    hasPatientWindowPassed,
    startCall,
    joinCall,
    declineCall,
  } = useCallManagement(props);

  const { participantName, scheduledAt } = props;
  const scheduledStartMs = scheduledAt ? new Date(scheduledAt).getTime() : null;

  return (
    <div className="relative flex gap-2">
      {incomingAlertOpen && pendingRoomInfo && (
        <div className="absolute top-14 right-0 z-30 w-80 rounded-3xl border border-rose-200 bg-white p-4 shadow-rose-900/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <BiPhoneCall size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wider text-rose-500">
                Incoming {pendingRoomInfo.type} call
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {participantName || "Participant"} is calling
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={declineCall}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Decline
            </button>
            <button
              onClick={joinCall}
              className="flex-1 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Join now
            </button>
          </div>
        </div>
      )}

      {autoJoinAvailable && pendingRoomInfo && (
        <button
          onClick={joinCall}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-600 transition-all animate-pulse"
        >
          {pendingRoomInfo.initiatedBy === props.user?.id
            ? "RETURN TO CALL"
            : "JOIN ACTIVE CALL"}
        </button>
      )}

      {!autoJoinAvailable && isCallWindowOpen && (
        <>
          <button
            onClick={() => startCall("voice")}
            disabled={statusLoading || callActive}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            title="Voice Call"
          >
            {statusLoading ? (
              <BiLoaderAlt className="animate-spin" />
            ) : (
              <BiPhoneCall size={20} />
            )}
          </button>
          <button
            onClick={() => startCall("video")}
            disabled={statusLoading || callActive}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            title="Video Call"
          >
            {statusLoading ? (
              <BiLoaderAlt className="animate-spin" />
            ) : (
              <BiVideo size={20} />
            )}
          </button>
        </>
      )}

      {!autoJoinAvailable &&
        !isCallWindowOpen &&
        scheduledAt &&
        !hasPatientWindowPassed && (
          <span className="text-xs font-semibold text-slate-400 px-2">
            Call opens at{" "}
            {new Date(
              scheduledStartMs! - PATIENT_CALL_WINDOW_LEAD_MS,
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
    </div>
  );
}
