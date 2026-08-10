# Google Maps Modernization QA

**Date:** 2026-08-10  
**Commit:** `fb859cd82e7e8c8d533dcc7fc02f70fdb69967e2`  
**Environments:** Cloudflare Preview (`dev`) and Production (`main`)

## Activation

- Confirmed Maps JavaScript API and Places API (New) are enabled in the `Travelgram` Google Cloud project.
- Created an approved JavaScript vector Map ID for Ikkyee web maps.
- Added the Map ID to Cloudflare Preview and Production under `GOOGLE_MAPS_MAP_ID` and `VITE_GOOGLE_MAPS_MAP_ID`.
- Redeployed the same verified commit in both environments without changing repository code.

## Browser-Key Controls

- Matched the deployed browser key to the Google Cloud credential by SHA-256 digest without recording the key value.
- Kept the credential restricted to the two Maps APIs already required by the application.
- Added HTTP referrer restrictions for the production Pages host, all Pages deployment/branch subdomains, and local Vite ports `5173` and `4173`.
- Did not enable a monthly Maps subscription. The project remains on pay-as-you-go billing.

## Verification

- Preview `/api/config` returns a non-empty API key and Map ID with `Cache-Control: no-store`.
- Production `/api/config` returns a non-empty API key and the same Map ID.
- Preview Explore renders the Google map and mounts `.explore-place-autocomplete` with the modern form state.
- Production Explore renders the Google map and mounts `.explore-place-autocomplete` with the modern form state.
- Both map surfaces continued to render after the HTTP referrer restriction was saved.
- `npm test`: 473 passed, 0 failed.

## Cost Boundary

- Google Maps Platform remains usage-based with no fixed monthly subscription selected.
- The dashboard showed zero usage for the previous three months before activation.
- Operators monitor Dynamic Maps loads and Places autocomplete sessions at 70% and 90% of their monthly free-usage thresholds.
