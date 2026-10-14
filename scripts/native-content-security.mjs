import { readFileSync } from 'node:fs';

export function createNativeContentSecurityPlugin({
    headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
} = {}) {
    const configured = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
    if (!configured) throw new Error('Native build requires the web Content-Security-Policy.');
    // These directives require HTTP response headers and are ignored in a meta tag.
    const policy = configured.split(';').map(directive => directive.trim())
        .filter(directive => directive && !/^(?:frame-ancestors|report-uri|report-to|sandbox)\b/i.test(directive))
        .join('; ');
    return {
        name: 'ikkyee-native-content-security',
        transformIndexHtml: {
            order: 'pre',
            handler: (html = '') => ({ html: html.replace(/<meta\s+charset=["']UTF-8["']\s*\/?\s*>/i, ''), tags: [
                // Keep encoding detection inside the first 1024 bytes, before
                // the long CSP value and all executable application scripts.
                { tag: 'meta', attrs: { charset: 'UTF-8' }, injectTo: 'head-prepend' },
                { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
                { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' }
            ] })
        }
    };
}
