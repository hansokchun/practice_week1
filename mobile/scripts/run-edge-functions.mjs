import { request } from "node:http";

const baseUrl = process.env["SUPABASE_LOCAL_URL"] ?? "http://127.0.0.1:54321";
const functionName = process.env["SUPABASE_EDGE_FUNCTION"];

if (functionName === undefined || !/^[a-z0-9-]+$/u.test(functionName)) {
  console.error("[edge:test] Set SUPABASE_EDGE_FUNCTION to a local function name. No secret values are printed.");
  process.exit(1);
}

const endpoint = new URL(`/functions/v1/${functionName}`, baseUrl);
const result = await new Promise((resolveResult, rejectResult) => {
  const req = request(endpoint, { method: "GET", timeout: 10_000 }, (response) => {
    response.resume();
    response.once("end", () => resolveResult(response.statusCode ?? 0));
  });
  req.once("error", rejectResult);
  req.once("timeout", () => req.destroy(new Error("Edge Function request timed out")));
  req.end();
});

if (result < 200 || result >= 300) {
  console.error(`[edge:test] Local function returned HTTP ${result}.`);
  process.exit(1);
}

console.log(`[edge:test] Local function returned HTTP ${result}.`);
