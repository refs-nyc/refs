/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

class EventPolyfill {
  constructor(type, eventInitDict) {
    this.type = type
    this.bubbles = !!(eventInitDict?.bubbles || false)
    this.cancelable = !!(eventInitDict?.cancelable || false)
    this.composed = !!(eventInitDict?.composed || false)
    this.scoped = !!(eventInitDict?.scoped || false)

    // TODO: somehow guarantee that only "private" instantiations of Event
    // can set this to true
    this.isTrusted = false

    // TODO: in the future we'll want to make sure this has the same
    // time-basis as events originating from native
    this.timeStamp = Date.now()

    this.defaultPrevented = false

    // https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
    this.NONE = 0
    this.AT_TARGET = 1
    this.BUBBLING_PHASE = 2
    this.CAPTURING_PHASE = 3
    this.eventPhase = this.NONE

    // $FlowFixMe
    this.currentTarget = null
    // $FlowFixMe
    this.target = null
    // $FlowFixMe
    this.srcElement = null
  }

  composedPath() {
    throw new Error('TODO: not yet implemented')
  }

  preventDefault() {
    this.defaultPrevented = true

    if (this._syntheticEvent != null) {
      // $FlowFixMe
      this._syntheticEvent.preventDefault()
    }
  }

  initEvent(type, bubbles, cancelable) {
    throw new Error('TODO: not yet implemented. This method is also deprecated.')
  }

  stopImmediatePropagation() {
    throw new Error('TODO: not yet implemented')
  }

  stopPropagation() {
    if (this._syntheticEvent != null) {
      // $FlowFixMe
      this._syntheticEvent.stopPropagation()
    }
  }

  setSyntheticEvent(value) {
    this._syntheticEvent = value
  }
}

global.Event = EventPolyfill

export default EventPolyfill
