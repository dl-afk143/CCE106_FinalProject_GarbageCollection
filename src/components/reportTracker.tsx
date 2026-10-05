import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { REPORT_STEPS } from "@/services/reportStore";

const GREEN = "#087F5B";
const LINE = "#E5E9EB";
const MUTED = "#64748B";
const INK = "#102A43";

export default function ReportTracker({ step }: { step: number }) {
  return (
    <View style={s.tracker}>
      {REPORT_STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <View key={label} style={s.step}>
            <View style={s.lineRow}>
              <View
                style={[s.line, i === 0 && s.lineHidden, i <= step && s.lineOn]}
              />
              <View style={[s.dot, done && s.dotDone, active && s.dotActive]}>
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
                {active && <View style={s.dotCore} />}
              </View>
              <View
                style={[
                  s.line,
                  i === REPORT_STEPS.length - 1 && s.lineHidden,
                  i < step && s.lineOn,
                ]}
              />
            </View>
            <Text style={[s.label, (done || active) && s.labelOn]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  tracker: { flexDirection: "row", marginTop: 20 },
  step: { flex: 1, alignItems: "center" },
  lineRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  line: { flex: 1, height: 3, backgroundColor: LINE },
  lineOn: { backgroundColor: GREEN },
  lineHidden: { backgroundColor: "transparent" },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: GREEN, borderColor: GREEN },
  dotActive: { borderColor: GREEN },
  dotCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },
  label: { fontSize: 12, color: MUTED, marginTop: 6 },
  labelOn: { color: INK, fontWeight: "700" },
});
