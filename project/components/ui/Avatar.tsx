import React from "react";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "offline" | "busy" | "none";
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  status = "none",
  className = "",
}) => {
  const sizes = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl",
    "2xl": "w-44 h-44 text-6xl",
  };

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-slate-400",
    busy: "bg-red-500",
    none: "",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`
        ${sizes[size]} rounded-lg overflow-hidden flex items-center justify-center  tracking-tighter
        ${src ? "bg-slate-100" : "bg-primary text-white"}
      `}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <h1> {initials}</h1>
        )}
      </div>

      {status !== "none" && (
        <span
          className={`
          absolute bottom-0 right-0 block rounded-lg ring-2 ring-white
          ${status === "online" ? "animate-pulse" : ""}
          ${statusColors[status]} 
          ${size === "xs" ? "w-2 h-2" : size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}
        `}
        />
      )}
    </div>
  );
};

export default Avatar;
