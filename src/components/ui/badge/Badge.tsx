// Copied from TailAdmin (components/ui/badge/Badge.tsx); dark-mode classes removed (D20).

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
export type BadgeColor =
  "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  /** Icon before the text. */
  startIcon?: React.ReactNode;
  /** Icon after the text. */
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

/** A small rounded label, e.g. a status. */
const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium";

  const sizeStyles = {
    sm: "text-theme-xs",
    md: "text-sm",
  };

  const variants = {
    light: {
      primary: "bg-brand-50 text-brand-500",
      success: "bg-success-50 text-success-600",
      error: "bg-error-50 text-error-600",
      warning: "bg-warning-50 text-warning-600",
      info: "bg-blue-light-50 text-blue-light-500",
      light: "bg-gray-100 text-gray-700",
      dark: "bg-gray-500 text-white",
    },
    solid: {
      primary: "bg-brand-500 text-white",
      success: "bg-success-500 text-white",
      error: "bg-error-500 text-white",
      warning: "bg-warning-500 text-white",
      info: "bg-blue-light-500 text-white",
      light: "bg-gray-400 text-white",
      dark: "bg-gray-700 text-white",
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
