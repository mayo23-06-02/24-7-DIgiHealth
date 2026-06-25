import React from "react";
import { signIn } from "next-auth/react";
import { BiLogoFacebook, BiLogoGoogle } from "react-icons/bi";

interface SocialLoginButtonsProps {
  loading: boolean;
}

export default function SocialLoginButtons({
  loading,
}: SocialLoginButtonsProps) {
  return (
    <div className="w-full flex justify-center items-center gap-2 pb-5">
      <button
        className="flex items-center justify-center gap-3 py-3 px-8 bg-white cursor-pointer rounded-lg hover:border-primary/30 hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
        disabled={loading}
        onClick={() => signIn("google", { callbackUrl: "/patient" })}
      >
        <BiLogoGoogle className="text-primary" />
        <span className="text-xs uppercase font-bold text-slate-600">
          Google
        </span>
      </button>
      <button
        className="flex items-center justify-center gap-3 py-3 px-8 bg-white cursor-pointer rounded-lg hover:border-primary/30 hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
        disabled={loading}
        onClick={() => signIn("facebook", { callbackUrl: "/patient" })}
      >
        <BiLogoFacebook className="text-primary" />
        <span className="text-xs uppercase font-bold text-slate-600">
          Facebook
        </span>
      </button>
    </div>
  );
}
