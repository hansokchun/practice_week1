import { isNativeApp, resolveNativeApiUrl } from './native-app-runtime.mjs';

function abortIfNeeded(signal) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

async function defaultNativeRequest(options) {
    const { CapacitorHttp } = await import('@capacitor/core');
    return CapacitorHttp.request(options);
}

export function createNativeApiFetch({
    capacitor = globalThis.Capacitor,
    fetchImpl = (...args) => globalThis.fetch(...args),
    nativeRequest = defaultNativeRequest
} = {}) {
    return async function fetchApi(path, options = {}) {
        if (!isNativeApp(capacitor)) return fetchImpl(path, options);
        abortIfNeeded(options.signal);
        const url = resolveNativeApiUrl(path, { capacitor });
        const headers = Object.fromEntries(new Headers(options.headers).entries());
        // Keep caller-supplied header casing for native SDKs and adapters.
        if (options.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)) {
            for (const [name, value] of Object.entries(options.headers)) {
                delete headers[name.toLowerCase()];
                headers[name] = String(value);
            }
        }
        let data = options.body;
        const contentType = new Headers(headers).get('content-type') ?? '';
        if (typeof data === 'string' && contentType.includes('application/json')) data = JSON.parse(data);
        if (data !== undefined && typeof data !== 'string' && (typeof data !== 'object' || data === null)) {
            throw new Error('지원하지 않는 서버 요청입니다.');
        }
        let result;
        try {
            result = await nativeRequest({
                url, method: String(options.method ?? 'GET').toUpperCase(), headers,
                ...(data === undefined ? {} : { data }),
                responseType: 'json', connectTimeout: 15_000, readTimeout: 30_000,
                disableRedirects: true
            });
        } catch {
            abortIfNeeded(options.signal);
            throw new Error('서버에 연결하지 못했어요. 다시 시도해 주세요.');
        }
        abortIfNeeded(options.signal);
        if (!Number.isInteger(result?.status) || result.status < 200 || result.status > 599
            || (result.status >= 300 && result.status < 400)) {
            throw new Error('서버에 연결하지 못했어요. 다시 시도해 주세요.');
        }
        const responseHeaders = new Headers(result.headers ?? {});
        if (!responseHeaders.has('content-type')) responseHeaders.set('content-type', 'application/json');
        const body = [204, 205, 304].includes(result.status) ? null
            : typeof result.data === 'string' ? result.data : JSON.stringify(result.data ?? null);
        return new Response(body, { status: result.status, headers: responseHeaders });
    };
}

export const fetchApi = (...args) => createNativeApiFetch()(...args);
