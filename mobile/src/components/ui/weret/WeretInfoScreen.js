import { Text, I18nManager } from "react-native";
import WeretListScreen from "./WeretListScreen";
import WeretStepHeader from "./WeretStepHeader";
import SectionSurface from "../SectionSurface";

/** Polished static content screen (earnings, help articles, etc.). */
export default function WeretInfoScreen({ title, subtitle, children, colors, spacing }) {
  const rtl = I18nManager.isRTL;
  const align = rtl ? "right" : "left";

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={title} subtitle={subtitle} colors={colors} spacing={spacing} />
      <SectionSurface elevated noEntering>
        {typeof children === "string" ? (
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, textAlign: align, fontWeight: "500" }}>{children}</Text>
        ) : (
          children
        )}
      </SectionSurface>
    </WeretListScreen>
  );
}
