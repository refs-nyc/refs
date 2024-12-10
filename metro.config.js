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
    return { type: 'sourceFile', filePath: __dirname + '/placeholder.js' }
  }

  // prevent import of @canvas-js/modeldb-sqlite-wasm
  if (moduleName === '@canvas-js/modeldb-sqlite-wasm') {
    return { type: 'sourceFile', filePath: __dirname + '/placeholder.js' }
  }

  // chain to the standard Metro resolver, but inject 'import' because
  // withMetroMultiPlatform.js tries to reset the condition when the platform is 'web'
  try {
    return context.resolveRequest(context, moduleName, platform)
  } catch (err) {
    if (!context.unstable_conditionNames.includes('import')) {
      context.unstable_conditionNames.push('import')
    }
    return context.resolveRequest(context, moduleName, platform)
  }
}

module.exports = config
