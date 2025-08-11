import { useAppStore } from '@/features/stores'
import { ExpandedItem, CompleteRef, Profile } from '@/features/types'
import { base, c, s, t } from '@/features/style'
import { SearchRef } from '@/ui/actions/SearchRef'
import { Avatar } from '@/ui/atoms/Avatar'
import { ContextMenu } from '@/ui/atoms/ContextMenu'
import { Checkbox, MeatballMenu } from '@/ui/atoms/MeatballMenu'
import { Button } from '@/ui/buttons/Button'
import { Sheet } from '@/ui/core/Sheets'
import { XStack, YStack } from '@/ui/core/Stacks'
import { ListContainer } from '@/ui/lists/ListContainer'
import { ProfileDetailsContext } from '@/ui/profiles/profileDetailsStore'

import { Heading } from '@/ui/typo/Heading'
import Ionicons from '@expo/vector-icons/Ionicons'
import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { useContext, useState, useEffect } from 'react'
import { Keyboard, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { TextInput } from 'react-native-gesture-handler'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated'
import { useStore } from 'zustand'

const LocationMeta = ({
  location,
  numberOfLines,
}: {
  location: string
  numberOfLines?: number
}) => {
  return (
    <XStack style={{ alignItems: 'center' }} gap={s.$05}>
      <Heading tag="smallmuted" numberOfLines={numberOfLines}>
        {location}
      </Heading>
    </XStack>
  )
}

const AuthorMeta = ({ author, numberOfLines }: { author: string; numberOfLines?: number }) => {
  return (
    <XStack style={{ alignItems: 'center' }} gap={s.$05}>
      <Heading tag="smallmuted" numberOfLines={numberOfLines}>
        {author}
      </Heading>
    </XStack>
  )
}

const Meta = ({ refRecord, numberOfLines }: { refRecord: CompleteRef; numberOfLines?: number }) => {
  if (!refRecord) return

  let refMeta: { location?: string; author?: string } = {}
  try {
    refMeta = JSON.parse(refRecord.meta!)
  } catch (e) {
    // ignore parsing errors, this must mean the meta is just a string  value
  }

  let location = refMeta.location
  let author = refMeta.author

  if (refRecord.type === 'place') {
    location = refRecord.meta
  } else if (refRecord.type === 'artwork') {
    author = refRecord.meta
  }

  return (
    <YStack gap={s.$05}>
      {location && <LocationMeta location={location} numberOfLines={numberOfLines} />}
      {author && <AuthorMeta author={author} numberOfLines={numberOfLines} />}
    </YStack>
  )
}

const ApplyChangesButton = () => {
  const { update, stopEditing, triggerProfileRefresh } = useAppStore()

  return (
    <Checkbox
      onPress={async () => {
        await update()
        stopEditing()
        triggerProfileRefresh()
      }}
    />
  )
}
ApplyChangesButton.displayName = 'ApplyChangesButton'

const ProfileLabel = ({ profile }: { profile: Profile }) => {
  const router = useRouter()
  return (
    <Pressable
      onPress={() => {
        router.replace(`/user/${profile.userName}`)
      }}
    >
      <XStack style={{ alignItems: 'center' }} gap={s.$075}>
        {/* show user avatar and name */}
        <Text style={{ fontSize: s.$1, fontWeight: 500, opacity: 0.6, color: c.muted }}>
          {profile.firstName}
        </Text>
        <Avatar size={s.$1} source={profile.image} />
      </XStack>
    </Pressable>
  )
}
ProfileLabel.displayName = 'ProfileLabel'

export const DetailsCarouselItem = ({ item, index }: { item: ExpandedItem; index?: number }) => {
  const win = useWindowDimensions()

  const profileDetailsStore = useContext(ProfileDetailsContext)
  const { currentIndex, showContextMenu, setShowContextMenu, openedFromFeed, editingRights } =
    useStore(profileDetailsStore)
  const [currentItem, setCurrentItem] = useState<ExpandedItem>(item)

  const {
    user,
    editing,
    startEditing,
    updateEditedState,
    setSearchingNewRef,
    editingLink,
    setEditingLink,
    update,
    searchingNewRef,
    addRefSheetRef,
    setAddingRefId,
    referencersBottomSheetRef,
    setCurrentRefId,
    getItemByIdWithFullExpansion,
  } = useAppStore()

  // Fetch full item data if it's a list and doesn't have items_via_parent
  useEffect(() => {
    const fetchFullItemData = async () => {
      console.log('🔍 Checking if we need to fetch full item data:', {
        isList: currentItem.list,
        hasItems: currentItem.expand?.items_via_parent?.length > 0,
        itemId: currentItem.id
      })
      
      if (currentItem.list && (!currentItem.expand?.items_via_parent || currentItem.expand.items_via_parent.length === 0)) {
        console.log('🔍 Fetching full item data for list:', currentItem.id)
        try {
          const fullItem = await getItemByIdWithFullExpansion(currentItem.id)
          console.log('🔍 Fetched full item data:', {
            hasItems: fullItem.expand?.items_via_parent?.length > 0,
            itemsCount: fullItem.expand?.items_via_parent?.length
          })
          setCurrentItem(fullItem)
        } catch (error) {
          console.error('Error fetching full item data:', error)
        }
      }
    }
    
    fetchFullItemData()
  }, [currentItem.id, currentItem.list, currentItem.expand?.items_via_parent, getItemByIdWithFullExpansion])
  
  // Lazy load editing state - only initialize when actually editing
  const [isEditingInitialized, setIsEditingInitialized] = useState(false)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [listTitle, setListTitle] = useState('')
  const [refTitle, setRefTitle] = useState('')

  const editingThisItem = editing === item.id

  // Initialize editing state only when needed
  useEffect(() => {
    if (editingThisItem && !isEditingInitialized) {
      setText(item?.text || '')
      setUrl(item?.url || '')
      setListTitle(item.list ? item?.expand.ref.title || '' : '')
      setRefTitle(item?.expand?.ref?.title || '')
      setIsEditingInitialized(true)
    }
  }, [editingThisItem, item.id, isEditingInitialized])

  // Sync local state with item data when not editing
  useEffect(() => {
    if (!editingThisItem) {
      setText(item?.text || '')
      setUrl(item?.url || '')
      setListTitle(item.list ? item?.expand.ref.title || '' : '')
      setRefTitle(item?.expand?.ref?.title || '')
      setIsEditingInitialized(false)
    }
  }, [item.id, item?.text, item?.url, item?.expand?.ref?.title, editingThisItem])

  const showAddRefButton = item.creator !== user?.id

  // Animated opacity for checkbox fade-in
  const checkboxOpacity = useSharedValue(0)
  
  useEffect(() => {
    if (editingThisItem) {
      checkboxOpacity.value = withTiming(1, { duration: 100 })
    } else {
      checkboxOpacity.value = withTiming(0, { duration: 80 })
    }
  }, [editingThisItem])

  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: checkboxOpacity.value,
    }
  })

  // Calculate title width based on whether there's a link icon
  const hasLinkIcon = !item.list && item.url
  const meatballWidth = s.$4 // 44px - smaller for better proportion
  const linkIconWidth = s.$4 // Always reserve space for link icon
  const iconSpacing = 8 // 8px between link and meatball icons
  const titleMargin = 12 // 12px spacing after title
  const totalIconsWidth =
    meatballWidth + linkIconWidth + iconSpacing + titleMargin
  const titleWidth = win.width - totalIconsWidth - s.$2 * 2 // subtract horizontal padding

  const animatedStyle = useAnimatedStyle(() => {
    return withTiming(
      editingThisItem ? base.editableItem : base.nonEditableItem,
      { duration: 150 }
    )
  }, [editingThisItem])

  return (
    <View
      style={{
        width: win.width,
        height: win.height * 0.8,
        gap: s.$1,
        justifyContent: 'flex-start',
        overflow: 'hidden',
      }}
      key={currentItem.id}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: s.$1, paddingTop: 15 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        alwaysBounceVertical={false}
        style={{ overflow: 'hidden' }}
      >
        <KeyboardAvoidingView
          behavior={'position'}
          keyboardVerticalOffset={openedFromFeed ? 70 : 120}
        >
          <View style={{ paddingLeft: s.$3, paddingTop: s.$1, paddingBottom: s.$05 }}>
            {openedFromFeed && <ProfileLabel profile={item.expand.creator} />}
          </View>
          <Animated.View style={[{ position: 'absolute', right: s.$2, top: s.$1, zIndex: 99 }, checkboxAnimatedStyle]}>
            {editingThisItem && <ApplyChangesButton />}
          </Animated.View>
          <Pressable
            style={{
              gap: s.$09,
              paddingHorizontal: s.$2,
            }}
            onPress={() => {
              setShowContextMenu(false)
            }}
            onLongPress={() => {
              setShowContextMenu(true)
            }}
          >
            {/* Image */}
            <BottomSheetView
              style={{
                width: '100%',
                aspectRatio: 1,
              }}
            >
              {/* Menu */}
              {showContextMenu && currentIndex == index && (
                <ContextMenu
                  onEditPress={() => {
                    startEditing(item.id)
                    setShowContextMenu(false)
                  }}
                  editingRights={editingRights}
                />
              )}
              {item.expand?.ref.image || item.image ? (
                <Zoomable minScale={0.25} maxScale={3} isPanEnabled={true}>
                  <Animated.View
                    style={[
                      animatedStyle,
                      {
                        width: '100%',
                        aspectRatio: 1,
                        overflow: 'hidden',
                        borderRadius: s.$075,
                      },
                    ]}
                  >
                    <BottomSheetView style={{ flex: 1, padding: s.$075 }}>
                      <Image
                        style={[
                          { flex: 1, aspectRatio: 1, overflow: 'hidden', borderRadius: s.$075 },
                        ]}
                        source={item.image || item.expand?.ref.image}
                      />
                    </BottomSheetView>
                  </Animated.View>
                </Zoomable>
              ) : (
                <BottomSheetView
                  style={{
                    flex: 1,
                    backgroundColor: c.surface2,
                  }}
                >
                  {/* List */}
                  {currentItem.list && <ListContainer editingRights={!!editingRights} item={currentItem} />}
                </BottomSheetView>
              )}
            </BottomSheetView>

            {/* Title */}
            <BottomSheetView style={{ width: '100%' }}>
              <BottomSheetView
                style={{
                  marginBottom: 0,
                  marginTop: -10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: s.$7,
                }}
              >
                {/* Title OR textinput for editing link*/}
                <View style={{ width: titleWidth, marginRight: titleMargin }}>
                  {editingThisItem && editingLink ? (
                    <TextInput
                      style={[
                        {
                          width: '100%',
                          paddingHorizontal: s.$1,
                          height: s.$7,
                        },
                        base.editableItem,
                      ]}
                      value={url}
                      placeholder="abc.xyz"
                      onChangeText={async (e) => {
                        setUrl(e)
                        updateEditedState({
                          url: e,
                        })
                      }}
                    />
                  ) : editingThisItem && item.list ? (
                    <TextInput
                      style={[
                        {
                          width: '100%',
                          paddingHorizontal: s.$1,
                          height: s.$7,
                        },
                        base.editableItem,
                      ]}
                      defaultValue={item.expand.ref.title}
                      value={listTitle}
                      placeholder="Add a list title"
                      onChangeText={async (e) => {
                        setListTitle(e),
                          updateEditedState({
                            listTitle: e,
                          })
                      }}
                    />
                  ) : editingThisItem ? (
                    <TextInput
                      style={[
                        {
                          position: 'absolute',
                          top: -25,
                          left: 10,
                          width: titleWidth,
                          paddingHorizontal: s.$1,
                          paddingVertical: 10,
                          textAlignVertical: 'center',
                          fontSize: s.$1,
                          fontWeight: '700',
                          color: '#000',
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                        base.editableItem,
                      ]}
                      value={refTitle}
                      placeholder="Add a title"
                      multiline={true}
                      onChangeText={async (e) => {
                        setRefTitle(e)
                        updateEditedState({
                          refTitle: e,
                        })
                      }}
                    />
                  ) : (
                    <Pressable
                      onPress={() => {
                        if (!editingThisItem) {
                          setCurrentRefId(item.ref)
                          referencersBottomSheetRef.current?.expand()
                          return
                        }
                        Keyboard.dismiss()
                        setSearchingNewRef(item.id)
                      }}
                      style={[
                        {
                          gap: s.$05,
                          width: '100%',
                          paddingHorizontal: s.$1,
                          justifyContent: 'center',
                          height: s.$7,
                        },
                        editingThisItem ? base.editableItem : base.nonEditableItem,
                      ]}
                    >
                      <BottomSheetView style={{ justifyContent: 'center', height: '100%' }}>
                        <Heading tag="h2" numberOfLines={2} style={{ flexShrink: 0 }}>
                          {item.expand?.ref?.title}
                        </Heading>
                        {item.expand?.ref ? (
                          <Meta refRecord={item.expand?.ref} numberOfLines={1} />
                        ) : null}
                      </BottomSheetView>
                    </Pressable>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Button for editing link */}
                  {!item.list && (
                    <View
                      style={{
                        width: s.$4,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: iconSpacing,
                      }}
                    >
                      {!editingThisItem && item.url && (
                        <Link
                          style={{ transformOrigin: 'center', transform: 'rotate(-45deg)' }}
                          href={item.url as any}
                        >
                          <Ionicons
                            color={c.muted}
                            size={s.$2}
                            fillColor="red"
                            name="arrow-forward-outline"
                          />
                        </Link>
                      )}
                      {editingThisItem && (
                        <Pressable onPress={() => setEditingLink(!editingLink)}>
                          <Ionicons
                            name={editingLink ? 'checkmark' : 'arrow-forward-outline'}
                            style={editingLink ? {} : { transform: [{ rotate: '-45deg' }] }}
                            size={s.$2}
                            color={c.muted}
                          />
                        </Pressable>
                      )}
                    </View>
                  )}
                  {/* Meatball Menu */}
                  <View
                    style={{
                      width: s.$4,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MeatballMenu
                      onPress={() => {
                        setShowContextMenu(!showContextMenu)
                      }}
                    />
                  </View>
                </View>
              </BottomSheetView>
            </BottomSheetView>

            {/* Notes */}
            <Animated.View
              style={{
                width: '100%',
                paddingHorizontal: s.$1,
                paddingVertical: s.$075,
              }}
            >
              {editingThisItem ? (
                <BottomSheetTextInput
                  value={text}
                  placeholder="Add a caption for your profile..."
                  style={[
                    { 
                      width: '100%', 
                      minHeight: s.$10,
                      paddingHorizontal: s.$1,
                      paddingVertical: 10,
                      color: c.muted,
                      backgroundColor: c.surface,
                      borderColor: c.grey1,
                      borderWidth: 2,
                      borderRadius: s.$075,
                    }, 
                  ]}
                  multiline={true}
                  maxLength={1000}
                  onChangeText={async (e) => {
                    updateEditedState({
                      text: e,
                    })
                    setText(e)
                  }}
                />
              ) : (
                <BottomSheetScrollView 
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  <Text style={t.pmuted}>
                    {text}
                  </Text>
                </BottomSheetScrollView>
              )}
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </BottomSheetScrollView>
      {showAddRefButton && (
        <View
          style={{
            width: '75%',
            alignSelf: 'center',
            position: 'absolute',
            bottom: -25,
          }}
        >
          <Button
            style={{ paddingTop: s.$2, paddingBottom: s.$2, width: '100%' }}
            textStyle={{ fontSize: s.$1, fontWeight: 800 }}
            onPress={() => {
              // open a dialog for adding this ref to your profile
              setAddingRefId(item.ref)
              addRefSheetRef.current?.expand()
            }}
            variant="raised"
            title="Add Ref +"
          />
        </View>
      )}
      {searchingNewRef && currentIndex == index && (
        <Sheet
          keyboardShouldPersistTaps="always"
          onClose={() => {
            setSearchingNewRef('')
            // Do not update the ref
          }}
          backgroundStyle={{ backgroundColor: c.olive }}
        >
          <SearchRef
            noNewRef
            onAddNewRef={(newRefFields) => {
              // never called
            }}
            onChooseExistingRef={async (r) => {
              // Update the ref
              updateEditedState({
                ref: r.id,
              })
              const newRecord = await update()
              setCurrentItem(newRecord as ExpandedItem)
              setSearchingNewRef('')
            }}
          />
        </Sheet>
      )}
    </View>
  )
}
