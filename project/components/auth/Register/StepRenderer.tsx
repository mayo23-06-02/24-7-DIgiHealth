import React from "react";
import { stepComponents } from "./stepComponents";

interface StepRendererProps {
  role: string;
  step: number;
  formData: any;
  updateData: (field: string, value: any) => void;
  errors: Record<string, string>;
  onSkip: () => void;
}

export default function StepRenderer({
  role,
  step,
  formData,
  updateData,
  errors,
  onSkip,
}: StepRendererProps) {
  const components = stepComponents[role];
  if (!components) return null;

  const StepComponent = components[step - 1]; // step is 1‑indexed
  if (!StepComponent) return null;

  return (
    <StepComponent
      formData={formData}
      updateData={updateData}
      errors={errors}
      onSkip={onSkip}
    />
  );
}
