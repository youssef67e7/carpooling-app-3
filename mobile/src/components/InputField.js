import { useState } from "react";
import { View, Text, TextInput, I18nManager } from "react-native";
import { weretAuth as A } from "../theme/weretAuth";
import { weretRadius } from "../theme/weretDesignSystem";

/** WERET form field — same style as WeretTextField (settings, legacy forms). */
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
  const rtl = I18nManager.isRTL;
  const [focused, setFocused] = useState(false);

  const borderColor = error ? A.danger : focused ? A.ink : A.border;
  const ringWidth = error ? 2 : focused ? 2 : 1.5;

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text
          style={{
            marginBottom: 6,
            color: A.muted,
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
        placeholderTextColor={A.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: A.field,
          color: A.ink,
          borderColor,
          borderWidth: ringWidth,
          borderRadius: weretRadius.sm,
          paddingVertical: 14,
          paddingHorizontal: 16,
          fontSize: 16,
          fontWeight: "600",
          textAlign: rtl ? "right" : "left",
        }}
      />
      {error ? (
        <Text style={{ color: A.danger, fontSize: 13, marginTop: 6, textAlign: rtl ? "right" : "left" }}>{error}</Text>
      ) : null}
    </View>
  );
}
