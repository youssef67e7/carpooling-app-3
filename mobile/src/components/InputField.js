import { useState } from "react";
import { View, Text, TextInput, I18nManager } from "react-native";
import { useTheme } from "../context/ThemeProvider";
import { weretRadius } from "../theme/weretDesignSystem";

export default function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  editable = true,
}) {
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.text : colors.border;
  const ringWidth = error ? 2 : focused ? 2 : 1.5;

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text
          style={{
            marginBottom: spacing.xs,
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1,
            textTransform: "uppercase",
            textAlign: rtl ? "right" : "left",
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          borderWidth: ringWidth,
          borderColor,
          borderRadius: weretRadius.field,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          backgroundColor: colors.surfaceMuted,
          textAlign: rtl ? "right" : "left",
        }}
      />
      {error ? (
        <Text style={{ marginTop: spacing.xs, color: colors.danger, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
