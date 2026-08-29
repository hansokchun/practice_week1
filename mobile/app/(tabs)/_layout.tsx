import { Tabs, router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { mobileColors } from "../../src/mobile-theme";
import { hiddenTabRoutes, profileRoute } from "../../src/mobile-routes";
import { DefaultProfileAvatar } from "../../src/DefaultProfileAvatar";

function ProfileButton() {
  return (
    <Pressable
      accessibilityLabel="프로필 열기"
      accessibilityRole="button"
      onPress={() => router.push(profileRoute)}
      style={styles.profileButton}
      testID="profile-open"
    >
      <DefaultProfileAvatar size={44} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileButton: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", overflow: "hidden", width: 44 }
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <ProfileButton />,
        headerRightContainerStyle: { paddingRight: 16 },
        headerStyle: { backgroundColor: mobileColors.paper },
        headerShadowVisible: false,
        headerTitleStyle: { color: mobileColors.ink, fontWeight: "800" },
        tabBarActiveTintColor: mobileColors.pineDeep,
        tabBarInactiveTintColor: mobileColors.muted,
        tabBarStyle: { display: "none" }
      }}
    >
      {hiddenTabRoutes.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ headerShown: false, tabBarButtonTestID: `tab-${tab.name}`, title: tab.label }}
        />
      ))}
    </Tabs>
  );
}
