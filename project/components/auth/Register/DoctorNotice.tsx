import Link from "next/link";

/** Doctors are added by their hospital, not by self sign-up. */
export default function DoctorNotice() {
  return (
    <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-6 py-10 md:p-10">
      <h2 className="mb-2 font-grotesk text-2xl font-bold tracking-tight text-slate-900">
        Doctors are added by their hospital
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Your hospital registers you and emails you a link to choose your password. If you have not
        received it, ask your hospital administrator to resend it.
      </p>
      <Link href="/login" className="font-bold text-primary underline">
        Sign in
      </Link>
    </div>
  );
}
