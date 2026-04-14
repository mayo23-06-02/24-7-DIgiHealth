"use client";

import React from "react";

interface SkeletonLoaderProps {
  className?: string;
  animate?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = "",
  animate = true,
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200/60 rounded-lg ${className} ${
        animate ? "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent" : ""
      }`}
    />
  );
};

export default SkeletonLoader;
