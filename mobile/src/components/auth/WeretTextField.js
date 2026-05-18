import { useState } from "react";
import { View, Text, TextInput, StyleSheet, I18nManager } from "react-native";
import { weretAuth as A } from "../../theme/weretAuth";

/** Uppercase micro-label + soft grey field (WERET phone / form style). */
export default function WeretTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  editable = true,
  error,
}) {
  const rtl = I18nManager.isRTL;
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
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
        style={[
          styles.input,
          {
            borderColor: error ? A.danger : focused ? A.ink : A.border,
            borderWidth: error ? 2 : focused ? 2 : 1,
            textAlign: rtl ? "right" : "left",
          },
        ]}
      />
      {error ? (
        <Text style={[styles.err, { textAlign: rtl ? "right" : "left" }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: A.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: A.field,
    borderRadius: A.radiusField,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: A.ink,
    fontWeight: "600",
  },
  err: { marginTop: 6, color: A.danger, fontSize: 13, fontWeight: "600" },
});
