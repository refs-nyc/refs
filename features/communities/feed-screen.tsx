import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, FlatList, ListRenderItem } from 'react-native'
import { s, c, t } from '@/features/style'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'

type FeedUser = {
  id: string
  userName?: string
  name: string
  neighborhood?: string
  avatar_url?: string
  topRefs?: string[]
}

export function CommunitiesFeedScreen() {
  // Directories screen: paginated list of all users
  const [users, setUsers] = useState<FeedUser[]>([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const perPage = 30
  const pbRef = useRef<typeof pocketbase | null>(null)
  const { setHomePagerIndex, setReturnToDirectories, user } = useAppStore()

  const getPB = () => {
    if (!pbRef.current) pbRef.current = pocketbase
    return pbRef.current
  }

  const mapUsersWithItems = useCallback((userRecords: any[], itemsByCreator: Map<string, any[]>) => {
    const result: (FeedUser & { _latest?: number })[] = []
    for (const r of userRecords) {
      const creatorId = r.id
      const creatorItems = itemsByCreator.get(creatorId) || []
      if (creatorItems.length === 0) continue // require at least 1 grid item
      const images = creatorItems
        .slice(0, 3)
        .map((it) => it?.image || it?.expand?.ref?.image)
        .filter(Boolean)
      const latest = creatorItems[0]?.created ? new Date(creatorItems[0].created).getTime() : 0
      result.push({
        id: r.id,
        userName: r.userName,
        name: r.firstName || r.name || r.userName,
        neighborhood: r.location || '',
        // Prefer `image` as source of truth, fallback to `avatar_url` if present
        avatar_url: r.image || r.avatar_url || '',
        topRefs: images,
        _latest: latest,
      } as any)
    }
    // Sort by most recently active (latest item)
    result.sort((a, b) => (b._latest || 0) - (a._latest || 0))
    return result as FeedUser[]
  }, [])

  const fetchPage = useCallback(async (targetPage: number) => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const pb = getPB()
      const res = await pb.collection('users').getList(targetPage, perPage, {
        fields: 'id,userName,firstName,lastName,name,location,image,avatar_url',
        sort: '-created',
      })

      // Batch fetch grid items for all users on this page
      const userIds = res.items.map((u: any) => u.id)
      if (userIds.length === 0) {
        setHasMore(false)
        setIsLoading(false)
        return
      }

      const orFilter = userIds.map((id: string) => `creator = "${id}"`).join(' || ')
      const perPageItems = Math.max(3 * userIds.length, 60)
      const itemsRes = await pb.collection('items').getList(1, perPageItems, {
        filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
        fields: 'id,image,creator,created,expand.ref(image)',
        expand: 'ref',
        sort: '-created',
      })

      // Group items by creator
      const byCreator = new Map<string, any[]>()
      for (const it of itemsRes.items as any[]) {
        const creatorId = it.creator
        if (!creatorId) continue
        const arr = byCreator.get(creatorId) || []
        if (arr.length < 3) {
          arr.push(it)
          byCreator.set(creatorId, arr)
        }
      }

      const mapped = mapUsersWithItems(res.items, byCreator)
      // Filter out the current user from the directory list
      const filteredMapped = mapped.filter(u => u.userName !== user?.userName)
      setUsers((prev) => (targetPage === 1 ? filteredMapped : [...prev, ...filteredMapped]))
      setHasMore(res.page < res.totalPages)
      setPage(res.page)
    } catch (e) {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, mapUsersWithItems])

  useEffect(() => {
    // Ensure returning back lands on Directories view
    setHomePagerIndex(1)
    fetchPage(1)
  }, [])

  const renderItem: ListRenderItem<FeedUser> = ({ item: u }) => (
    <Pressable
      key={u.id}
      style={{
        backgroundColor: c.surface,
        borderRadius: s.$1,
        paddingVertical: (s.$1 as number) + 0,
        paddingHorizontal: s.$08,
        marginBottom: s.$075,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      
      onPress={() => {
        if (u.userName) {
          // Ensure back returns to directories view
          setReturnToDirectories?.(true)
          router.push(`/user/${u.userName}`)
        }
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Image
          source={u.avatar_url || 'https://i.pravatar.cc/100'}
          style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.surface }}
          contentFit={'cover'}
          cachePolicy="memory-disk"
          priority="low"
        />
        <View style={{ flex: 1, marginLeft: 5, gap: 4 }}>
          <Text style={[t.psemi, { fontSize: (s.$09 as number) + 4 }]} numberOfLines={1} ellipsizeMode="tail">
            {u.name}
          </Text>
          <Text style={[t.smallmuted, { opacity: 0.6 }]} numberOfLines={1} ellipsizeMode="tail">
            {u.neighborhood || 'Neighborhood'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginLeft: s.$08 }}>
        {(u.topRefs || []).slice(0, 3).map((src, idx) => (
          <Image
            key={idx}
            source={src}
            style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: c.surface }}
            contentFit={'cover'}
            cachePolicy="memory-disk"
            priority="low"
          />
        ))}
      </View>
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header sits outside the surface2 backdrop */}
      <View style={{ paddingVertical: s.$1, alignItems: 'flex-start', justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6 }}>
        <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
          viewing <Text style={{ fontWeight: '700' }}>Edge Patagonia</Text>
        </Text>
      </View>
      {/* Surface2 backdrop containing only results, inset 10px from screen edges with 10px inner padding and rounded shoulders; lifted above dots */}
      <View style={{ flex: 1, backgroundColor: c.surface2, marginHorizontal: 10, borderRadius: s.$1, overflow: 'hidden', marginBottom: 115, marginTop: 10 }}>
        <View style={{ flex: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          initialNumToRender={20}
          windowSize={5}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!isLoading && hasMore) fetchPage(page + 1)
          }}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        />
        </View>
      </View>
    </View>
  )
}

