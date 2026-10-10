import { createShareResponse } from '../_shared/share-preview.mjs';

export function onRequestGet({ request, params }) {
    return createShareResponse(request, params.path);
}
