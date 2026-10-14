// Build-time browser replacements: the website never loads native SDKs.
export const isNativeApp = () => false;
export const NATIVE_AUTH_CALLBACK_URL = 'ikkyee://auth/callback';
export const getNativeApiOrigin = () => 'https://ikkyee.com';
export const fetchApi = (...args) => globalThis.fetch(...args);
export const bindNativeAppRuntime = async () => ({ native: false, dispose: async () => {} });
export const bindNativeExternalLinks = () => () => {};
export const createNativeAuthStorage = () => { throw new Error('앱에서만 사용할 수 있습니다.'); };
export const authorizeNativeOAuth = async () => ({ data: null, error: new Error('앱에서만 사용할 수 있습니다.') });
export const cancelNativeOAuth = async () => {};
export const registerNativeAuthCallbacks = async () => async () => {};
const unhandled = () => ({ handled: false, data: null, error: null });
export const shareNativeContent = async () => unhandled();
export const saveNativePhoto = async () => unhandled();
