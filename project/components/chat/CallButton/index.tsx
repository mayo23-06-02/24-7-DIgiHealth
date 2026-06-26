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
    statusLoading,
    isCallWindowOpen,
    hasPatientWindowPassed,
    startCall,
    joinCall,
  } = useCallManagement(props);

  const { participantName, scheduledAt } = props;
  const scheduledStartMs = scheduledAt ? new Date(scheduledAt).getTime() : null;

  return (
    <div className="relative flex gap-2">
      {/* Show "JOIN ACTIVE CALL" button if there is an active call in this conversation */}
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

      {/* Start call buttons (only if no active call and within window) */}
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

      {/* Show countdown to call window opening */}
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
