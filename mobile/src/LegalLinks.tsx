import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { mobileColors } from "./mobile-theme";

const origin = "https://practice-week1-cws.pages.dev";

export const storePublicUrls = {
  accountDeletion: `${origin}/account-deletion/`,
  privacy: `${origin}/privacy/`,
  support: `${origin}/support/`
} as const;

type LegalLinksProps = {
  readonly openUrl?: (url: string) => Promise<unknown>;
};

export function LegalLinks({ openUrl = Linking.openURL }: LegalLinksProps) {
  const links = [
    { label: "개인정보 처리방침", url: storePublicUrls.privacy },
    { label: "지원", url: storePublicUrls.support },
    { label: "계정 삭제 안내", url: storePublicUrls.accountDeletion }
  ] as const;

  return (
    <View accessibilityLabel="정책과 지원" style={styles.section}>
      <Text style={styles.title}>정책과 지원</Text>
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            accessibilityLabel={link.label}
            accessibilityRole="link"
            key={link.url}
            onPress={() => void openUrl(link.url)}
            style={styles.link}
          >
            <Text style={styles.linkText}>{link.label}</Text>
            <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: "stretch", borderTopColor: mobileColors.line, borderTopWidth: 1, marginTop: 28, paddingTop: 20 },
  title: { color: mobileColors.ink, fontSize: 17, fontWeight: "800" },
  links: { marginTop: 8 },
  link: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 48 },
  linkText: { color: mobileColors.pineDeep, fontSize: 14, fontWeight: "700" },
  arrow: { color: mobileColors.muted, fontSize: 24 }
});
