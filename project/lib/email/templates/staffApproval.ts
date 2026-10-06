import { escapeHtml, renderEmail } from "../layout";

/** Request for an existing practitioner to approve being linked to a facility. */
export function staffApprovalEmailHtml(params: {
  facilityName: string;
  doctorName: string;
  approvalUrl: string;
  adminName?: string;
  department?: string;
}): string {
  const { facilityName, doctorName, approvalUrl, adminName, department } = params;
  const f = escapeHtml(facilityName);
  const by = adminName ? ` (${escapeHtml(adminName)})` : "";
  const details: [string, string][] = [["Facility", facilityName]];
  if (department) details.push(["Department", department]);
  return renderEmail({
    preheader: `${facilityName} would like to add you to its medical staff.`,
    eyebrow: "Facility link request",
    title: "Approve a facility link",
    icon: "&#127973;",
    greeting: `Dear Dr. ${escapeHtml(doctorName)},`,
    paragraphs: [
      `A hospital administrator${by} from <strong>${f}</strong> would like to add you to their medical staff${department ? ` in the ${escapeHtml(department)} department` : ""}.`,
      "Approving allows you to see patients and manage consultations through this facility on 24/7 Digi-Health.",
    ],
    details,
    cta: { label: "Review and approve", url: approvalUrl },
    notes: ["This request expires in 48 hours. If you were not expecting this email, you can safely ignore it."],
  });
}
