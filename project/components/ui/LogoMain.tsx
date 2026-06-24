import Image from "next/image";
import React from "react";

function LogoMain({
  width,
  height,
  alt,
}: {
  width: number;
  height: number;
  alt: boolean;
}) {
  return (
    <div>
      <Image
        src={alt ? "/Logo-White.svg" : "/Logo-Main.svg"}
        alt="Logo"
        width={width}
        height={height}
      />
    </div>
  );
}

export default LogoMain;
