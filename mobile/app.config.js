function optionalValue(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

const storePrivacyContract = require('./store-privacy-contract.json');
const platformSupport = require('./platform-support.json');

const PRODUCTION_LINK_ORIGIN = 'https://practice-week1-cws.pages.dev';
const PREVIEW_LINK_ORIGIN = 'https://dev.practice-week1-cws.pages.dev';

function normalizeLinkOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' ||
      url.pathname !== '/' || url.search !== '' || url.hash !== '') throw new Error();
    return url.origin;
  } catch {
    throw new Error('Universal link origin must be an HTTPS origin.');
  }
}

function resolveLinkOrigin(appEnvironment, environment) {
  const configured = optionalValue(environment.EXPO_PUBLIC_LINK_ORIGIN);
  const expected = appEnvironment === 'production' ? PRODUCTION_LINK_ORIGIN
    : appEnvironment === 'preview' ? PREVIEW_LINK_ORIGIN : null;
  const resolved = configured === null ? expected : normalizeLinkOrigin(configured);
  if (expected !== null && resolved !== expected) {
    throw new Error('Universal link origin does not match the release environment.');
  }
  return resolved;
}

function buildExpoConfig(config, environment = process.env) {
  const appEnvironment = optionalValue(environment.EXPO_PUBLIC_APP_ENV) ?? 'development';
  const expoGoTestMode = environment.IKKYEE_EXPO_GO_TEST === '1';
  const androidKey = optionalValue(environment.GOOGLE_MAPS_ANDROID_API_KEY);
  const iosKey = optionalValue(environment.GOOGLE_MAPS_IOS_API_KEY);
  const hasBothKeys = androidKey !== null && iosKey !== null;
  const requiresKeys = !expoGoTestMode && (appEnvironment === 'preview' || appEnvironment === 'production');
  const publicLinkOrigin = resolveLinkOrigin(appEnvironment, environment);

  if ((androidKey === null) !== (iosKey === null) || (requiresKeys && !hasBothKeys)) {
    throw new Error('Native map configuration requires restricted iOS and Android keys together.');
  }

  const plugins = (config.plugins ?? []).filter((plugin) =>
    !(plugin === 'react-native-maps' || plugin === 'expo-build-properties' ||
      (Array.isArray(plugin) && ['react-native-maps', 'expo-build-properties'].includes(plugin[0])))
  );
  plugins.push(['expo-build-properties', {
    android: { minSdkVersion: platformSupport.android.minimumApiLevel },
    ios: { deploymentTarget: platformSupport.ios.minimumVersion }
  }]);
  if (hasBothKeys && !expoGoTestMode) {
    plugins.push(['react-native-maps', {
      androidGoogleMapsApiKey: androidKey,
      iosGoogleMapsApiKey: iosKey
    }]);
  }

  const linkHost = publicLinkOrigin === null ? null : new URL(publicLinkOrigin).host;
  const associatedDomains = (config.ios?.associatedDomains ?? [])
    .filter((domain) => !domain.startsWith('applinks:practice-week1-cws.pages.dev') &&
      !domain.startsWith('applinks:dev.practice-week1-cws.pages.dev'));
  if (linkHost !== null) associatedDomains.push(`applinks:${linkHost}`);

  const intentFilters = (config.android?.intentFilters ?? []).filter((filter) =>
    !(filter?.action === 'VIEW' && Array.isArray(filter.data) &&
      filter.data.some((entry) => entry?.path === '/photo-link'))
  );
  if (linkHost !== null) intentFilters.push({
    action: 'VIEW',
    autoVerify: true,
    data: [{ scheme: 'https', host: linkHost, path: '/photo-link' }],
    category: ['BROWSABLE', 'DEFAULT']
  });

  return {
    ...config,
    ios: {
      ...(config.ios ?? {}),
      deploymentTarget: platformSupport.ios.minimumVersion,
      privacyManifests: storePrivacyContract.apple.privacyManifest,
      ...(linkHost === null ? {} : { associatedDomains })
    },
    android: {
      ...(config.android ?? {}),
      ...(linkHost === null ? {} : { intentFilters })
    },
    extra: {
      ...(config.extra ?? {}),
      expoGoTestMode,
      nativeMapsEnabled: hasBothKeys && !expoGoTestMode,
      nativePlaceSearchEnabled: hasBothKeys && !expoGoTestMode,
      publicLinkOrigin
    },
    plugins
  };
}

module.exports = ({ config }) => buildExpoConfig(config);
module.exports.buildExpoConfig = buildExpoConfig;
