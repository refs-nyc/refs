import { useAppStore } from '@/features/stores'
import { MyProfile } from './MyProfile'
import { OtherProfile } from './OtherProfile'

export const Profile = ({ did }: { did: string }) => {
  const { user } = useAppStore()

  const ownProfile = user?.did === did

  if (ownProfile) {
    return <MyProfile did={did} />
  } else {
    return <OtherProfile did={did} />
  }
}
