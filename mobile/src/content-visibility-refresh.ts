import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export const SIGNED_URL_REFRESH_INTERVAL_MS = 270_000;

function canRefreshInState(state: string | null): boolean {
  return state !== "background" && state !== "inactive";
}

export function useContentVisibilityRefreshKey(): number {
  const [refreshKey, setRefreshKey] = useState(0);
  const focused = useRef(false);
  const hasFocused = useRef(false);
  const previousAppState = useRef(AppState.currentState);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRefreshInterval = useCallback(() => {
    if (refreshInterval.current === null) return;
    clearInterval(refreshInterval.current);
    refreshInterval.current = null;
  }, []);

  const startRefreshInterval = useCallback(() => {
    clearRefreshInterval();
    refreshInterval.current = setInterval(() => {
      if (focused.current && canRefreshInState(previousAppState.current)) {
        setRefreshKey((value) => value + 1);
      }
    }, SIGNED_URL_REFRESH_INTERVAL_MS);
  }, [clearRefreshInterval]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (hasFocused.current) setRefreshKey((value) => value + 1);
    else hasFocused.current = true;
    if (canRefreshInState(previousAppState.current)) startRefreshInterval();
    return () => {
      focused.current = false;
      clearRefreshInterval();
    };
  }, [clearRefreshInterval, startRefreshInterval]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const becameActive = previousAppState.current !== "active" && nextState === "active";
      previousAppState.current = nextState;
      if (nextState !== "active") clearRefreshInterval();
      if (becameActive && focused.current) {
        setRefreshKey((value) => value + 1);
        startRefreshInterval();
      }
    });
    return () => {
      subscription.remove();
      clearRefreshInterval();
    };
  }, [clearRefreshInterval, startRefreshInterval]);

  return refreshKey;
}
