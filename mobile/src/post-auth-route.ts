import { profileRoute } from "./mobile-routes";

const SAFE_PHOTO_DETAIL_ROUTE = /^\/explore-photo\/[A-Za-z0-9._:-]{1,128}$/u;

export function resolvePostAuthRoute(value: unknown): string {
  if (typeof value !== "string" || !SAFE_PHOTO_DETAIL_ROUTE.test(value) || value.includes("..")) {
    return profileRoute;
  }
  return value;
}
