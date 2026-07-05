import PractitionerAppointments from "@/components/dashboard/practitioner/PractitionerAppointments";

export const metadata = {
  title: "Appointments | Practitioner Dashboard",
  description: "Manage your consultation appointments and patient requests.",
};

export default function PractitionerAppointmentsPage() {
  return <PractitionerAppointments />;
}