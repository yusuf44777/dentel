import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  secureToggle?: boolean; // show/hide eye icon for password fields
};

export function Input({
  label,
  error,
  secureToggle = false,
  secureTextEntry,
  ...props
}: InputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center bg-white border rounded-xl px-4 ${
          error ? "border-danger" : "border-slate-200"
        }`}
      >
        <TextInput
          className="flex-1 py-3.5 text-slate-900 text-base"
          placeholderTextColor={Colors.muted}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={Colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-danger text-xs mt-1">{error}</Text>
      )}
    </View>
  );
}
