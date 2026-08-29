import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { emptyStateStyles as styles } from "./mobile-theme";

type EmptyTabScreenProps = {
  actionLabel: string;
  description: string;
  emptyTitle: string;
  onAction?: () => void;
  testID?: string;
  title: string;
};

export function EmptyTabScreen({ actionLabel, description, emptyTitle, onAction, testID, title }: EmptyTabScreenProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.brand}>Ikkyee</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyCopy}>{description}</Text>
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
