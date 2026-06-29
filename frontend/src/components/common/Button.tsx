import { memo, type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "surface";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Core button component of the design system.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap cursor-pointer";

  const variants = {
    primary: "bg-brand text-white hover:bg-brand-hover",
    secondary: "bg-white text-black hover:bg-white/90",
    surface: "bg-[#1a1a1a] hover:bg-[#222222] text-white border border-white/5",
    ghost: "hover:bg-white/10 text-white",
    outline: "border border-white/20 text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
    xl: "px-10 py-4.5 text-lg font-black",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className} active:brightness-90`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export default memo(Button);
