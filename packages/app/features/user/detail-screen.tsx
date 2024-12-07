import { Button, Paragraph, YStack } from '@my/ui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/navigation'
import { NewProfile, Profile } from '@my/ui'

export function UserDetailScreen({ id }: { id: string }) {
  const router = useRouter()
  if (!id) {
    return null
  }

  return (
    <>
      {id === 'new' && <NewProfile />}
      {/* TBD */}
      {/* {id !== 'new' && <Profile profile={} />} */}
    </>
  )
}
