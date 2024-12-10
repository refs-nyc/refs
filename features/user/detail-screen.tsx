import { NewProfile, Profile } from '@/ui'

export function UserDetailScreen({ id }: { id: string }) {
  if (!id) {
    return null
  }

  return (
    <>
      {id === 'new' && <NewProfile />}
      {/* TBD */}
      {id !== 'new' && <Profile userName={id} />}
    </>
  )
}
