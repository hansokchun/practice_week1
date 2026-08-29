import * as Network from "expo-network";

export type ExploreConnectivity = "online" | "offline" | "unknown";

export async function getExploreConnectivity(): Promise<ExploreConnectivity> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false || state.isInternetReachable === false) return "offline";
    if (state.isConnected === true || state.isInternetReachable === true) return "online";
    return "unknown";
  } catch {
    return "unknown";
  }
}
