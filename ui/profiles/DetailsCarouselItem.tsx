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
import { useContext, useState } from 'react'
import { Keyboard, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { TextInput } from 'react-native-gesture-handler'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
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
        router.replace(`/user/${profile.did}`)
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
  } = useAppStore()
  const [text, setText] = useState(item?.text)
  const [url, setUrl] = useState(item?.url)
  const [listTitle, setListTitle] = useState(item.list ? item?.expand.ref.title : '')

  const editingThisItem = editing === item.id

  const showAddRefButton = item.creator !== user?.did

  // Calculate title width based on whether there's a link icon
  const hasLinkIcon = !item.list && item.url
  const meatballWidth = s.$4 // 44px - smaller for better proportion
  const linkIconWidth = hasLinkIcon ? s.$4 : 0 // 44px or 0
  const iconSpacing = 8 // 8px between link and meatball icons
  const titleMargin = 12 // 12px spacing after title
  const totalIconsWidth =
    meatballWidth + (hasLinkIcon ? linkIconWidth + iconSpacing : 0) + titleMargin
  const titleWidth = win.width - totalIconsWidth - s.$2 * 2 // subtract horizontal padding

  const animatedStyle = useAnimatedStyle(() => {
    return editingThisItem ? base.editableItem : base.nonEditableItem
  }, [editingThisItem])

  return (
    <View
      style={{
        width: win.width,
        height: win.height * 0.8,
        gap: s.$1,
        justifyContent: 'flex-start',
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
                  {item.list && <ListContainer editingRights={!!editingRights} item={item} />}
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
                        height: s.$4,
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
                            size={s.$2half}
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
                            size={s.$2half}
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
                      height: s.$4,
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
