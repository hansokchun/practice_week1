import { createPhotoLinkFallbackResponse } from '../_shared/mobile-link-association.mjs';

export function onRequestGet() {
  return createPhotoLinkFallbackResponse();
}
