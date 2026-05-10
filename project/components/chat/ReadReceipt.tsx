import React from "react";
import { BiCheck, BiCheckDouble } from "react-icons/bi";

export default function ReadReceipt({
  isRead,
  isSent,
}: {
  isRead: boolean;
  isSent?: boolean;
}) {
  if (!isSent) return null;

  return (
    <div className="flex items-center ml-1">
      {isRead ? (
        <BiCheckDouble className="text-primary" size={16} />
      ) : (
        <BiCheck className="text-slate-500" size={16} />
      )}
    </div>
  );
}
