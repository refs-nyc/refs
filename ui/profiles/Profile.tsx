import { useAppStore } from '@/features/pocketbase'
import { MyProfile } from './MyProfile'
import { OtherProfile } from './OtherProfile'

export const Profile = ({ userName }: { userName: string }) => {
  const { user } = useAppStore()

  const ownProfile = user?.userName === userName

  if (ownProfile) {
    return <MyProfile userName={userName} />
  } else {
    return <OtherProfile userName={userName} />
  }
}
