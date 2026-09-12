import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileColors } from "./mobile-theme";

const destinations = [
  { path: "/", label: "발견", icon: "compass-outline", selectedIcon: "compass" },
  { path: "/explore", label: "지도", icon: "map-outline", selectedIcon: "map" },
  { path: "/my-photos", label: "내 사진", icon: "images-outline", selectedIcon: "images" },
  { path: "/likes", label: "좋아요", icon: "heart-outline", selectedIcon: "heart" },
  { path: "/profile", label: "프로필", icon: "person-outline", selectedIcon: "person" }
] as const;

export function AppNavigation({ pathname, navigate }: {
  readonly pathname: string;
  readonly navigate: (path: string) => void;
}) {
  const insets = useSafeAreaInsets();
  if (!destinations.some((item) => item.path === pathname)) return null;
  return <View accessibilityLabel="주요 메뉴" style={[styles.bar, { paddingBottom: Math.max(8, insets.bottom) }]}>
    {destinations.map((item) => {
      const active = pathname === item.path;
      return <Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
        key={item.path} onPress={() => { if (!active) navigate(item.path); }}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
        <View style={[styles.icon, active && styles.activeIcon]}>
          <Ionicons accessible={false} name={active ? item.selectedIcon : item.icon} size={22} color={active ? mobileColors.pine : mobileColors.muted} />
        </View>
        <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: mobileColors.surface, borderTopColor: mobileColors.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", paddingHorizontal: 8, paddingTop: 6 },
  item: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 54, gap: 3 },
  icon: { alignItems: "center", justifyContent: "center", width: 48, height: 28, borderRadius: 14 },
  activeIcon: { backgroundColor: mobileColors.mist },
  label: { color: mobileColors.muted, fontSize: 11, lineHeight: 16, fontWeight: "500" },
  activeLabel: { color: mobileColors.pine, fontWeight: "700" },
  pressed: { opacity: 0.6 }
});
