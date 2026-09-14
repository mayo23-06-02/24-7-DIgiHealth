"use client";

import React, { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";

const CATEGORIES = [
  { value: "technical", label: "Technical issue" },
  { value: "medical", label: "Medical question" },
  { value: "service", label: "General service query" },
  { value: "practitioner", label: "Practitioner-related" },
  { value: "payment", label: "Payment issue" },
  { value: "subscription", label: "Subscription/billing" },
];

const SUPPORT_EMAIL = "info@digi-health.co.za";

/**
 * "Contact Guidance Team" on the registration screens. Used to be a tel:
 * link to a placeholder number — replaced with an email handoff, since
 * there's no one staffed to answer a phone line at this stage. Routes to
 * a single shared inbox, so the category picker exists to make triage
 * possible from the subject line rather than needing a live agent.
 */
export default function ContactGuidanceLink({
  className = "text-primary font-bold hover:underline ml-2",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const categoryLabel =
      CATEGORIES.find((c) => c.value === category)?.label || "General service query";
    const subject = `[${categoryLabel}] Registration support request`;
    const body = message.trim()
      ? message.trim()
      : "Describe your issue here...";
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Contact Guidance Team
      </button>

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Contact Guidance Team"
        description={`We'll open your email app with a message addressed to ${SUPPORT_EMAIL}.`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1.5">
              What's this about?
            </label>
            <Select
              value={category}
              onChange={setCategory}
              options={CATEGORIES}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-1.5">
              Tell us what's going on (optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="A few details help us help you faster..."
            />
          </div>
          <Button fullWidth onClick={handleSend}>
            Open Email to Guidance Team
          </Button>
        </div>
      </Dialog>
    </>
  );
}
