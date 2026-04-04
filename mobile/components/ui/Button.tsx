import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";
import { Colors } from "../../constants/colors";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = TouchableOpacityProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: "bg-primary rounded-xl py-4 items-center justify-center",
    text: "text-white font-semibold text-base",
  },
  secondary: {
    container: "bg-white border border-slate-200 rounded-xl py-4 items-center justify-center",
    text: "text-slate-800 font-semibold text-base",
  },
  ghost: {
    container: "py-3 items-center justify-center",
    text: "text-primary font-medium text-sm",
  },
  danger: {
    container: "bg-danger rounded-xl py-4 items-center justify-center",
    text: "text-white font-semibold text-base",
  },
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { container, text } = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`${container} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-50" : ""}`}
      style={style}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" || variant === "ghost" ? Colors.primary : "#fff"}
          size="small"
        />
      ) : (
        <Text className={text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
