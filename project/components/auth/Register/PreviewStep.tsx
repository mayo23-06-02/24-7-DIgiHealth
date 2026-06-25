import React from "react";

export default function PreviewStep({ formData }: { formData: any }) {
  const previewData = { ...formData };
  delete previewData.password;
  delete previewData.confirmPassword;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Application Preview
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Please review your details before final submission.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(previewData).map(([key, value]) => {
          if (value === undefined || value === null || value === "")
            return null;
          let displayValue = String(value);
          if (typeof value === "boolean") displayValue = value ? "Yes" : "No";
          else if (Array.isArray(value)) displayValue = value.join(", ");
          else if (typeof value === "object") {
            if (value && (value as any).url) displayValue = "Uploaded Document";
            else return null;
          }

          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());

          return (
            <div
              key={key}
              className="p-4 bg-slate-50 rounded-xl border border-slate-100"
            >
              <p className="text-xs font-bold text-slate-500 mb-1">
                {formattedKey}
              </p>
              <p className="text-sm font-semibold text-slate-800 break-words">
                {displayValue}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
