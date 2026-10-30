import { onRequestGet } from './config.js';
import { collectSiteActivity } from '../lib/site-activity.mjs';

export async function onRequest(context) {
    const response = await onRequestGet(context);
    const config = await response.json();
    return collectSiteActivity({ request: context.request, env: context.env, allowed: config.siteActivityEnabled === true });
}
