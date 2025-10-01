import { useAppStore } from '@/features/stores'
import { MyProfile } from './MyProfile'
import { OtherProfile } from './OtherProfile'

export const Profile = ({ userName, prefetchedUserId }: { userName: string; prefetchedUserId?: string }) => {
  const { user } = useAppStore()

  const ownProfile = user?.userName === userName

  if (ownProfile) {
    return <MyProfile userName={userName} />
  } else {
    return <OtherProfile userName={userName} prefetchedUserId={prefetchedUserId} />
  }
}
