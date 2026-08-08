import React from "react";
import Input from "./Input";

type TextareaProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
  "type"
> & {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
  fullWidth?: boolean;
};

/** Convenience alias for `<Input textarea />` — same field contract, multi-line. */
const Textarea: React.FC<TextareaProps> = (props) => (
  <Input {...props} textarea />
);

export default Textarea;
