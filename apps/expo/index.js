import { install } from 'react-native-quick-crypto'
install()

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillEncoding()

import 'event-target-polyfill'

import './custom-event-polyfill'

import 'expo-router/entry'
