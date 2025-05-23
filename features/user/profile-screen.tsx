import { Profile } from '@/ui'

export function UserProfileScreen({ userName }: { userName: string }) {
  if (!userName) {
    return null
  }

  return <Profile userName={userName} />
}
