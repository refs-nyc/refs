import { Profile } from '@/ui'

export function UserProfileScreen({ did }: { did: string }) {
  if (!did) {
    return null
  }

  return <Profile did={did} />
}
