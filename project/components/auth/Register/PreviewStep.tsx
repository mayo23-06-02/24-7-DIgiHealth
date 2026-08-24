import React, { useEffect, useState } from "react";
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

export default function PreviewStep({
  formData,
  updateData,
}: {
  formData: any;
  updateData?: (field: string, value: any) => void;
}) {
  /**
   * Someone can be invited to a family and then sign up on their own instead of
   * following the emailed link. Without this they would finish registration
   * with the invite still sitting unanswered, and the guardian would see a
   * pending invite for an account that already exists.
   *
   * The lookup returns only whether an invite exists and who sent it — never
   * the invite token, which is the credential that claims it. The linking is
   * done server-side at registration, keyed on the verified address.
   */
  const [invite, setInvite] = useState<{
    guardianName: string;
    relationship?: string | null;
  } | null>(null);

  const arrivedFromInviteLink = !!formData.familyInviteToken;
  const email = formData.email;

  useEffect(() => {
    if (!email || arrivedFromInviteLink) return;
    let cancelled = false;
    fetch("/api/invites/family/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.data?.pending) {
          setInvite({
            guardianName: json.data.guardianName,
            relationship: json.data.relationship,
          });
          // Default to joining — they were invited, and the alternative is
          // silently ignoring it.
          updateData?.("joinFamily", true);
        }
      })
      .catch(() => {
        /* a failed check just means no prompt; registration is unaffected */
      });
    return () => {
      cancelled = true;
    };
  }, [email, arrivedFromInviteLink, updateData]);

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
  const documentFields = ["profilePhoto", "medicalDocuments"];
  const securityFields = ["password", "confirmPassword"]; // we'll hide these
  const consentFields = ["consent"];

  const renderValue = (value: any, key?: string) => {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
      if (key === "medicalDocuments") {
        return `${value.length} document${value.length === 1 ? "" : "s"} uploaded`;
      }
      return value.join(", ");
    }
    if (key === "profilePhoto" && typeof value === "string") {
      return "1 document uploaded";
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:gap-4 gap-2">
          {entries.map((key) => {
            const value = formData[key];
            let displayValue: string | React.ReactNode = renderValue(value, key);
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
                className=""
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

      {arrivedFromInviteLink && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-ink-900">
            Joining a family account
          </p>
          <p className="mt-1 text-sm text-ink-600">
            You were invited to join this family plan. Once you finish
            registering and verify your email, you&apos;ll be linked
            automatically.
          </p>
        </div>
      )}

      {invite && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-ink-900">
            {invite.guardianName} invited you to their family plan
          </p>
          <p className="mt-1 text-sm text-ink-600">
            This email has a pending invite
            {invite.relationship ? ` as their ${invite.relationship}` : ""}.
            Would you like to join?
          </p>
          <div
            role="radiogroup"
            aria-label="Family invite"
            className="mt-3 flex flex-wrap gap-2"
          >
            {[
              { value: true, label: "Yes, join the family plan" },
              { value: false, label: "No, keep my account separate" },
            ].map(({ value, label }) => {
              const active = (formData.joinFamily ?? true) === value;
              return (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateData?.("joinFamily", value)}
                  className={`min-h-11 rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-ink-600 hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Declining removes the invite. They can always send another.
          </p>
        </div>
      )}

      {renderSection("Personal Information", identityFields, <BiUser />)}
      {renderSection("Health Profile", healthFields, <BiHeart />)}
      {renderSection("Documents", documentFields, <BiFile />)}
      {renderSection("Consent", consentFields, <BiCheckShield />)}
    </div>
  );
}
