import { createAndroidAssociationResponse } from '../_shared/mobile-link-association.mjs';

export function onRequestGet({ env }) {
  return createAndroidAssociationResponse(env);
}
