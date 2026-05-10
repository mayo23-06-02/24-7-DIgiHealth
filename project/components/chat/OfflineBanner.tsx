import React from "react";
import { BiWifiOff, BiCloudUpload } from "react-icons/bi";

export default function OfflineBanner() {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        <BiWifiOff className="text-gray-600" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-800  tracking-normal">
          You are offline
        </p>
        <p className="text-xs text-gray-600 font-bold  flex items-center gap-1">
          <BiCloudUpload /> Messages will be sent when connection is restored
        </p>
      </div>
    </div>
  );
}
