import type { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

// Copied from TailAdmin (components/form/Label.tsx); dark-mode classes removed (D20).

interface LabelProps {
  /** The `id` of the input this label belongs to; clicking the label focuses that input. */
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** A form field label with the theme's default styling. `className` can override it. */
const Label: FC<LabelProps> = ({ htmlFor, children, className }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={twMerge(
        "mb-1.5 block text-sm font-medium text-gray-700",
        className,
      )}
    >
      {children}
    </label>
  );
};

export default Label;
