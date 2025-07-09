// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const { transformer, resolver } = config

// Enable stack traces
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
}

// SVG Support
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
}

config.resolver.unstable_enablePackageExports = true

config.resolver.unstable_conditionNames = ['require', 'import', 'react-native', 'ios', 'default']

// crypto polyfills
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // when importing crypto, resolve to react-native-quick-crypto
  if (moduleName === 'crypto') {
    return context.resolveRequest(context, 'react-native-quick-crypto', platform)
  }

  // prevent quickjs-emscripten from importing "node:module"
  if (moduleName === 'module') {
    return { type: 'empty' }
  }
  if (moduleName === 'quickjs-emscripten') {
    return { type: 'empty' }
  }

  // prevent import of canvas packages that are unused, but cause react native errors
  if (moduleName === '@canvas-js/modeldb-sqlite-wasm') {
    return { type: 'empty' }
  }

  // otherwise chain to the standard Metro resolver.
  return context.resolveRequest(context, moduleName, platform)
}

// SVG Support
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
}

module.exports = config
