import type { FC } from 'react'

const KILL_PROFILE = process.env.EXPO_PUBLIC_KILL_PROFILE === '1'

type MyProfileProps = { userName: string }

let MyProfileImpl: FC<MyProfileProps>

if (KILL_PROFILE) {
  MyProfileImpl = () => null
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const inner = require('./MyProfileInner') as typeof import('./MyProfileInner')
  MyProfileImpl = inner.MyProfile
}

const MyProfile = MyProfileImpl

export { MyProfile }
export default MyProfile
