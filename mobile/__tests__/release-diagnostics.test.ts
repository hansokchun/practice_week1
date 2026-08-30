import {
  createReleaseDiagnosticBuffer,
  type ReleaseDiagnosticEvent,
} from "../src/release-diagnostics";

describe("privacy-safe release diagnostics", () => {
  it("records only allowlisted release context at minute precision", () => {
    const sent: ReleaseDiagnosticEvent[] = [];
    const diagnostics = createReleaseDiagnosticBuffer({
      capacity: 3,
      clock: () => new Date("2026-08-30T08:12:49.000Z"),
      release: {
        appEnvironment: "preview",
        appVersion: "0.1.0",
        platform: "ios",
      },
      sink: (event) => sent.push(event),
    });

    const event = diagnostics.record("ui-render-failure", "app-shell");

    expect(event).toEqual({
      appEnvironment: "preview",
      appVersion: "0.1.0",
      code: "ui-render-failure",
      occurredAtMinute: "2026-08-30T08:12:00.000Z",
      platform: "ios",
      severity: "error",
      surface: "app-shell",
    });
    expect(sent).toEqual([event]);
    expect(JSON.stringify(event)).not.toMatch(/token|email|photo|latitude|longitude|stack|message/iu);
  });

  it("keeps a bounded in-memory history without accepting arbitrary payloads", () => {
    const diagnostics = createReleaseDiagnosticBuffer({
      capacity: 2,
      clock: () => new Date("2026-08-30T08:12:00.000Z"),
      release: {
        appEnvironment: "development",
        appVersion: "0.1.0",
        platform: "web",
      },
    });

    diagnostics.record("remote-data-unavailable", "landing");
    diagnostics.record("native-capability-unavailable", "local-library");
    diagnostics.record("ui-render-failure", "app-shell");

    expect(diagnostics.snapshot().map((event) => event.code)).toEqual([
      "native-capability-unavailable",
      "ui-render-failure",
    ]);
  });
});
