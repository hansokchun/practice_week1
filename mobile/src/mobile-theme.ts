import { StyleSheet } from "react-native";

export const mobileColors = {
  paper: "#f7f8f6",
  surface: "#ffffff",
  ink: "#191c1c",
  muted: "#687478",
  pine: "#245457",
  pineDeep: "#003637",
  gold: "#c9a050",
  line: "#dce3df",
  mist: "#eaf0ed"
} as const;

export const emptyStateStyles = StyleSheet.create({
  safeArea: { backgroundColor: mobileColors.paper, flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 18 },
  brand: { color: mobileColors.pine, fontFamily: "Georgia", fontSize: 16, fontWeight: "700" },
  title: { color: mobileColors.ink, fontSize: 26, fontWeight: "700", marginTop: 3 },
  body: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  emptyTitle: { color: mobileColors.ink, fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptyCopy: { color: mobileColors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: "center" },
  button: { alignItems: "center", backgroundColor: mobileColors.pineDeep, borderRadius: 8, minHeight: 48, justifyContent: "center", marginTop: 24, paddingHorizontal: 20 },
  buttonText: { color: mobileColors.surface, fontSize: 15, fontWeight: "800" }
});
