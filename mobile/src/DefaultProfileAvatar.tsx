import { Image, StyleSheet } from "react-native";

type DefaultProfileAvatarProps = {
  readonly size: number;
};

export function DefaultProfileAvatar({ size }: DefaultProfileAvatarProps) {
  return (
    <Image
      accessibilityLabel="기본 프로필 이미지"
      source={require("../assets/default-profile-avatar.png")}
      style={[styles.image, { borderRadius: size / 2, height: size, width: size }]}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: "#f9f7f2" }
});
