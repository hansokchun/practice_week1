import { Platform } from "react-native";

import releaseContract from "../release-contract.json";

export type ReleaseDiagnosticCode =
  | "app-start-failure"
  | "native-capability-unavailable"
  | "remote-data-unavailable"
  | "ui-render-failure";

export type ReleaseDiagnosticSurface =
  | "app-shell"
  | "authentication"
  | "explore"
  | "landing"
  | "local-library"
  | "photo-detail"
  | "profile"
  | "publication"
  | "shared-link";

export type ReleaseDiagnosticEvent = {
  readonly appEnvironment: "development" | "preview" | "production";
  readonly appVersion: string;
  readonly code: ReleaseDiagnosticCode;
  readonly occurredAtMinute: string;
  readonly platform: "android" | "ios" | "web";
  readonly severity: "error" | "warning";
  readonly surface: ReleaseDiagnosticSurface;
};

type ReleaseContext = Pick<ReleaseDiagnosticEvent, "appEnvironment" | "appVersion" | "platform">;

type DiagnosticBufferOptions = {
  readonly capacity?: number;
  readonly clock?: () => Date;
  readonly release: ReleaseContext;
  readonly sink?: (event: ReleaseDiagnosticEvent) => void;
};

const severityByCode: Readonly<Record<ReleaseDiagnosticCode, ReleaseDiagnosticEvent["severity"]>> = {
  "app-start-failure": "error",
  "native-capability-unavailable": "warning",
  "remote-data-unavailable": "warning",
  "ui-render-failure": "error",
};

function minuteTimestamp(date: Date) {
  const rounded = new Date(date);
  rounded.setUTCSeconds(0, 0);
  return rounded.toISOString();
}

export function createReleaseDiagnosticBuffer({
  capacity = 50,
  clock = () => new Date(),
  release,
  sink,
}: DiagnosticBufferOptions) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    throw new Error("Diagnostic capacity must be between 1 and 100.");
  }
  const events: ReleaseDiagnosticEvent[] = [];

  return {
    record(code: ReleaseDiagnosticCode, surface: ReleaseDiagnosticSurface) {
      const event: ReleaseDiagnosticEvent = Object.freeze({
        ...release,
        code,
        occurredAtMinute: minuteTimestamp(clock()),
        severity: severityByCode[code],
        surface,
      });
      events.push(event);
      if (events.length > capacity) events.splice(0, events.length - capacity);
      try {
        sink?.(event);
      } catch {
        // Diagnostics must never make the app less recoverable.
      }
      return event;
    },
    snapshot() {
      return [...events];
    },
  };
}

function currentEnvironment(): ReleaseContext["appEnvironment"] {
  // @ts-expect-error Expo requires static dot access so EXPO_PUBLIC values are inlined at bundle time.
  const value = process.env.EXPO_PUBLIC_APP_ENV;
  return value === "preview" || value === "production" ? value : "development";
}

function currentPlatform(): ReleaseContext["platform"] {
  return Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";
}

const releaseDiagnostics = createReleaseDiagnosticBuffer({
  release: {
    appEnvironment: currentEnvironment(),
    appVersion: releaseContract.marketingVersion,
    platform: currentPlatform(),
  },
});

export function recordReleaseDiagnostic(code: ReleaseDiagnosticCode, surface: ReleaseDiagnosticSurface) {
  return releaseDiagnostics.record(code, surface);
}

export function getLocalReleaseDiagnostics() {
  return releaseDiagnostics.snapshot();
}
