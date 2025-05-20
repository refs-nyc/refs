import SearchResultsScreen from '@/features/home/search'
import { useLocalSearchParams } from 'expo-router'

export default function Screen() {
  const { refs } = useLocalSearchParams()
  const refIds = typeof refs === 'string' ? refs.split(',') : refs

  return <SearchResultsScreen refIds={refIds} />
}
