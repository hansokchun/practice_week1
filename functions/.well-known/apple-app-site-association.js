import { createAppleAssociationResponse } from '../_shared/mobile-link-association.mjs';

export function onRequestGet({ env }) {
  return createAppleAssociationResponse(env);
}
