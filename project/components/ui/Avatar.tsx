import React from "react";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "offline" | "busy" | "none";
  className?: string;
}

const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
  "2xl": "w-44 h-44 text-6xl",
};

const statusColors = {
  online: "bg-success-500",
  offline: "bg-slate-400",
  busy: "bg-danger-500",
  none: "",
};

// Use primary color consistently for all avatars
function paletteFor(name: string) {
  return "bg-primary";
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "?",
  size = "md",
  status = "none",
  className = "",
}) => {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full overflow-hidden flex items-center justify-center font-grotesk font-bold text-white tracking-tighter ring-2 ring-white ${
          src ? "bg-slate-100" : paletteFor(name || "?")
        }`}
      >
        {src ? (
          <img src={src} alt={name || "Avatar"} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {status !== "none" && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${statusColors[status]} ${
            size === "xs" ? "w-2 h-2" : size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;

export const AvatarGroup: React.FC<{
  avatars: { name: string; src?: string }[];
  max?: number;
  size?: AvatarProps["size"];
}> = ({ avatars, max = 4, size = "sm" }) => {
  const shown = avatars.slice(0, max);
  const overflow = avatars.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((a, i) => (
        <div key={i} className={i === 0 ? "" : "-ml-3"}>
          <Avatar name={a.name} src={a.src} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`-ml-3 ${sizes[size]} rounded-full bg-slate-200 text-slate-600 ring-2 ring-white flex items-center justify-center font-grotesk font-bold`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};
