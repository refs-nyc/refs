// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

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

  // prevent import of @canvas-js/modeldb-sqlite-wasm
  if (moduleName === '@canvas-js/modeldb-sqlite-wasm') {
    return { type: 'empty' }
  }

  // prevent import of quickjs-emscripten
  if (moduleName === 'quickjs-emscripten') {
    return { type: 'empty' }
  }

  // otherwise chain to the standard Metro resolver.
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
