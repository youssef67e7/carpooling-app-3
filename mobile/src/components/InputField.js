import { useState } from "react";
import { View, Text, TextInput, StyleSheet, I18nManager } from "react-native";
import { useTheme } from "../context/ThemeProvider";

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
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  const ringWidth = focused && !error ? 2 : 1;

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text
          style={{
            marginBottom: spacing.xs,
            color: focused ? colors.text : colors.textMuted,
            fontSize: 14,
            fontWeight: focused ? "600" : "500",
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
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          fontSize: 16,
          color: colors.text,
          backgroundColor: colors.surface,
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
