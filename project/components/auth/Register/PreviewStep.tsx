import React from "react";
import {
  BiUser,
  BiPhone,
  BiEnvelope,
  BiCalendar,
  BiFemale,
  BiMale,
  BiHeart,
  BiDroplet,
  BiRun,
  BiPlus,
  BiFile,
  BiLock,
  BiCheckShield,
} from "react-icons/bi";

export default function PreviewStep({ formData }: { formData: any }) {
  // Helper to format keys
  const formatKey = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

  // Group data for display
  const identityFields = [
    "firstName",
    "lastName",
    "saId",
    "email",
    "mobile",
    "dob",
    "gender",
  ];
  const healthFields = [
    "heightCm",
    "weightKg",
    "bloodType",
    "activityLevel",
    "allergies",
    "chronicConditions",
  ];
  const documentFields = ["profilePhoto", "medicalDocument"];
  const securityFields = ["password", "confirmPassword"]; // we'll hide these
  const consentFields = ["consent"];

  const renderValue = (value: any) => {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") {
      if (value && (value as any).url) return "Uploaded Document";
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderSection = (
    title: string,
    fields: string[],
    icon: React.ReactNode,
  ) => {
    const entries = fields.filter((f) => {
      // Hide sensitive data
      if (f === "password" || f === "confirmPassword") return false;
      const val = formData[f];
      return (
        val !== undefined &&
        val !== null &&
        val !== "" &&
        !(Array.isArray(val) && val.length === 0)
      );
    });
    if (entries.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary text-xl">{icon}</span>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {title}
          </h4>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((key) => {
            const value = formData[key];
            let displayValue: string | React.ReactNode = renderValue(value);
            // Custom formatting for certain keys
            if (key === "dob") {
              const d = new Date(value);
              displayValue = d.toLocaleDateString();
            }
            if (key === "gender") {
              displayValue =
                value === "Male" ? (
                  <span className="flex items-center gap-1">
                    <BiMale /> Male
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <BiFemale /> Female
                  </span>
                );
            }
            if (key === "consent") {
              displayValue = value ? (
                <span className="text-green-600 flex items-center gap-1">
                  <BiCheckShield /> Granted
                </span>
              ) : (
                "Not granted"
              );
            }
            return (
              <div
                key={key}
                className="p-4 bg-slate-50 rounded-lg border border-slate-100"
              >
                <p className="text-xs font-bold text-slate-500 mb-1">
                  {formatKey(key)}
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
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs text-primary tracking-normal">
          Application Preview
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Please review your details before final submission. You can go back to
        edit any section.
      </p>

      {renderSection("Personal Information", identityFields, <BiUser />)}
      {renderSection("Health Profile", healthFields, <BiHeart />)}
      {renderSection("Documents", documentFields, <BiFile />)}
      {renderSection("Consent", consentFields, <BiCheckShield />)}
    </div>
  );
}
