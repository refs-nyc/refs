import { useItemStore, useUserStore } from '@/features/pocketbase'
import { RefsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
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
import { useUIStore } from '@/ui/state'
import { Heading } from '@/ui/typo/Heading'
import Ionicons from '@expo/vector-icons/Ionicons'
import { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { useContext, useState } from 'react'
import { Keyboard, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { TextInput } from 'react-native-gesture-handler'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useStore } from 'zustand'

const LocationMeta = ({ location }: { location: string }) => {
  return (
    <XStack style={{ alignItems: 'center' }} gap={s.$05}>
      <Heading tag="smallmuted">{location}</Heading>
    </XStack>
  )
}

const AuthorMeta = ({ author }: { author: string }) => {
  return (
    <XStack style={{ alignItems: 'center' }} gap={s.$05}>
      <Heading tag="smallmuted">{author}</Heading>
    </XStack>
  )
}

const Meta = ({ refRecord }: { refRecord: RefsRecord }) => {
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
    <YStack gap={s.$05} style={{ paddingVertical: s.$05 }}>
      {location && <LocationMeta location={location} />}
      {author && <AuthorMeta author={author} />}
    </YStack>
  )
}

const ApplyChangesButton = () => {
  const update = useItemStore((state) => state.update)
  const stopEditing = useItemStore((state) => state.stopEditing)
  const triggerProfileRefresh = useItemStore((state) => state.triggerProfileRefresh)

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

const ProfileLabel = ({ profile }: { profile: ExpandedProfile }) => {
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
  const {
    currentIndex,
    showContextMenu,
    setShowContextMenu,
    openedFromFeed,
    editingRights,
    profile,
  } = useStore(profileDetailsStore)
  const [currentItem, setCurrentItem] = useState<ExpandedItem>(item)
  const { addRefSheetRef, setAddingRefId } = useUIStore()

  const {
    editing,
    startEditing,
    updateEditedState,
    setSearchingNewRef,
    editingLink,
    setEditingLink,
    update,
    searchingNewRef,
  } = useItemStore()
  const [text, setText] = useState(item?.text)
  const [url, setUrl] = useState(item?.url)
  const [listTitle, setListTitle] = useState(item.list ? item?.expand.ref.title : '')

  const { referencersBottomSheetRef, setCurrentRefId } = useUIStore()
  const editingThisItem = editing === item.id
  const { user } = useUserStore()

  const showAddRefButton = item.creator !== user?.id

  const animatedStyle = useAnimatedStyle(() => {
    return editingThisItem ? base.editableItem : base.nonEditableItem
  }, [editingThisItem])

  return (
    <View
      style={{
        width: win.width,
        height: openedFromFeed ? win.height * 0.8 : win.height * 0.8 - s.$7,
        gap: s.$1,
        justifyContent: 'flex-start',
      }}
      key={currentItem.id}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: s.$1 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <KeyboardAvoidingView
          behavior={'position'}
          keyboardVerticalOffset={openedFromFeed ? 70 : 120}
        >
          <View style={{ paddingLeft: s.$3, paddingTop: s.$1, paddingBottom: s.$05 }}>
            {openedFromFeed && <ProfileLabel profile={profile} />}
          </View>
          <View style={{ position: 'absolute', right: s.$3, top: s.$2, zIndex: 99 }}>
            {editing && <ApplyChangesButton />}
          </View>
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
                <Zoomable
                  minScale={0.25}
                  maxScale={3}
                  isPanEnabled={true}
                  onInteractionEnd={() => console.log('onInteractionEnd')}
                  onPanStart={() => console.log('onPanStart')}
                  onPanEnd={() => console.log('onPanEnd')}
                  onPinchStart={() => console.log('onPinchStart')}
                  onPinchEnd={() => console.log('onPinchEnd')}
                  onSingleTap={() => console.log('onSingleTap')}
                  onDoubleTap={(zoomType) => {
                    console.log('onDoubleTap', zoomType)
                  }}
                >
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
                  {item.list && <ListContainer editingRights={!!editingRights} item={item} />}
                </BottomSheetView>
              )}
            </BottomSheetView>

            {/* Title */}
            <BottomSheetView style={{ width: '100%' }}>
              <BottomSheetView
                style={{
                  marginBottom: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: s.$09,
                }}
              >
                {/* Title OR textinput for editing link*/}
                {editingThisItem && editingLink ? (
                  <TextInput
                    style={[{ flex: 1, paddingHorizontal: s.$1 }, base.editableItem]}
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
                      { flex: 1, paddingHorizontal: s.$1, paddingVertical: s.$1 },
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
                        flex: 1,
                        paddingHorizontal: s.$1,
                      },
                      editingThisItem ? base.editableItem : base.nonEditableItem,
                    ]}
                  >
                    <BottomSheetView
                      style={{
                        paddingVertical: s.$08,
                      }}
                    >
                      <Heading tag="h2">{item.expand?.ref?.title}</Heading>
                      {item.expand?.ref ? <Meta refRecord={item.expand?.ref} /> : null}
                    </BottomSheetView>
                  </Pressable>
                )}
                {/* Button for editing link */}
                {!item.list && (
                  <View
                    style={[
                      {
                        width: s.$4,
                        height: s.$4,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                      editingThisItem ? base.editableItem : base.nonEditableItem,
                    ]}
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
                <MeatballMenu
                  onPress={() => {
                    setShowContextMenu(!showContextMenu)
                  }}
                />
              </BottomSheetView>
            </BottomSheetView>

            {/* Notes */}
            <Animated.View
              style={[
                {
                  width: '100%',
                  minHeight: s.$10,
                  paddingHorizontal: s.$1,
                  paddingVertical: s.$075,
                },
                animatedStyle,
              ]}
            >
              {editingThisItem ? (
                <BottomSheetTextInput
                  defaultValue={item.text}
                  placeholder="Add a caption for your profile..."
                  style={[{ width: '100%', minHeight: s.$10 }, t.pmuted]}
                  multiline={true}
                  numberOfLines={4}
                  onChangeText={async (e) => {
                    updateEditedState({
                      text: e,
                    })
                    setText(e)
                  }}
                ></BottomSheetTextInput>
              ) : (
                <Text numberOfLines={4} style={t.pmuted}>
                  {text}
                </Text>
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
            bottom: 0,
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
            console.log('close')
            setSearchingNewRef('')
            // Do not update the ref
          }}
        >
          <SearchRef
            noNewRef
            onComplete={async (e) => {
              // Update the ref
              console.log(e.id)
              await updateEditedState({
                ref: e.id,
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
