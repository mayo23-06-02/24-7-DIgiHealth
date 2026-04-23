import React from "react";
import { BiWifiOff, BiCloudUpload } from "react-icons/bi";

export default function OfflineBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
        <BiWifiOff className="text-amber-600" />
      </div>
      <div>
        <p className="text-xs font-bold text-amber-800 uppercase tracking-normal">
          You are offline
        </p>
        <p className="text-xs text-amber-600 font-bold uppercase flex items-center gap-1">
          <BiCloudUpload /> Messages will be sent when connection is restored
        </p>
      </div>
    </div>
  );
}
