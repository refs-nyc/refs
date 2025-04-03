import { Feed } from '@/features/home/feed'
import { RequireAuth } from '@/ui/navigation/RequireAuth'

export default function Screen() {
  return (
    <RequireAuth>
      <Feed />
    </RequireAuth>
  )
}
