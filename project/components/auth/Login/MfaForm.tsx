import React from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface MfaFormProps {
  mfaToken: string;
  setMfaToken: (val: string) => void;
  loading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function MfaForm({
  mfaToken,
  setMfaToken,
  loading,
  error,
  onSubmit,
  onCancel,
}: MfaFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-6 mb-8">
        <p className="text-sm text-slate-500 text-center">
          Please enter the MFA code sent to your registered device.
        </p>
        <Input
          label="MFA Token"
          required
          value={mfaToken}
          onChange={(e) => setMfaToken(e.target.value)}
          placeholder="6-digit code"
          className="border-none bg-slate-50/80 focus:bg-white transition-all py-4 text-center tracking-normal text-xl"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm font-bold text-center">{error}</p>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={loading}
        className="py-5 text-base tracking-normal font-bold"
      >
        {loading ? "Verifying..." : "Verify & Login"}
      </Button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-primary transition-colors text-center"
      >
        Cancel & Return
      </button>
    </form>
  );
}
