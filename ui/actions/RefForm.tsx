import { useState, useEffect } from 'react'
import { usePathname } from 'expo-router'
import { View, TouchableOpacity, Dimensions } from 'react-native'
import { BottomSheetScrollView, BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'

import { Heading } from '@/ui/typo/Heading'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { EditableHeader } from '../atoms/EditableHeader'
import { addToProfile } from '@/features/pocketbase'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'
import { StagedRef, Item } from '@/features/pocketbase/stores/types'

const win = Dimensions.get('window')

export const RefForm = ({
  r,
  placeholder = 'Add a title',
  onComplete,
  onCancel,
  backlog = false,
  attach = true,
}: {
  r: StagedRef
  placeholder?: string
  onComplete: (i: Item) => void
  onCancel: () => void
  backlog?: boolean
  attach?: boolean
}) => {
  const [currentRef, setCurrentRef] = useState<StagedRef>({ ...r })
  const [currentRefComment, setCurrentRefComment] = useState<string>()
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [pinataSource, setPinataSource] = useState('')
  const [picking, setPicking] = useState(false)

  const pathname = usePathname()

  // Mandatory
  // Ref title
  // Ref image

  useEffect(() => {
    // Initialize image state based on incoming ref
    if (r?.image) {
      if (typeof r.image === 'string') {
        setPinataSource(r.image)
      } else {
        setImageAsset(r.image)
      }
    }
  }, [r])

  const updateRefImage = (image: string) => {
    setPinataSource(image)

    const u = { ...r, image }
    setCurrentRef(u)
  }

  const updateRefTitle = (title: string) => {
    const u = { ...r, title }
    setCurrentRef(u)
  }

  const updateRefUrl = (url: string) => {
    const u = { ...r, url }
    setCurrentRef(u)
  }

  const updateData = (d: { title: string; url: string; image: string }) => {
    updateRefTitle(d.title)
    updateRefImage(d.image)
    updateRefUrl(d.url)
    setImageAsset(d.image)
  }

  const submit = async (extraFields?: any) => {
    const data = {
      ...currentRef,
      image: pinataSource,
      backlog,
      ...extraFields,
    }

    try {
      const item = await addToProfile(data, !pathname.includes('onboarding'), {
        comment: currentRefComment,
        backlog,
      })
      onComplete(item)
    } catch (e) {
      console.error(e)
    } finally {
      console.log('Done')
    }
  }

  return (
    <View
      style={{ justifyContent: 'center', alignItems: 'center', gap: s.$2, marginVertical: s.$4 }}
    >
      <View style={{ width: 200, height: 200 }}>
        {pinataSource ? (
          <TouchableOpacity style={{ flex: 1 }} onLongPress={() => setPicking(true)}>
            <SimplePinataImage
              placeholder={imageAsset?.uri}
              placeholderContentFit="cover"
              originalSource={pinataSource}
              style={{ flex: 1, borderRadius: 10 }}
              imageOptions={{ width: 400, height: 400 }}
            />
          </TouchableOpacity>
        ) : imageAsset ? (
          <PinataImage
            asset={imageAsset}
            onReplace={() => setPicking(true)}
            onSuccess={(url) => {
              Image.prefetch(url)
                .then(() => {
                  setPinataSource(url)
                })
                .catch((err) => {
                  console.error('Failed to prefetch image:', err)
                })
            }}
            onFail={() => console.error('Upload failed')}
          />
        ) : (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPicking(true)}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: c.black,
                borderRadius: s.$075,
              }}
            >
              <Heading tag="h1light">+</Heading>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {picking && (
        <Picker
          onSuccess={(a: ImagePickerAsset) => {
            setImageAsset(a)
          }}
          onCancel={() => setPicking(false)}
        />
      )}

      <EditableHeader
        onComplete={updateRefTitle}
        onDataChange={updateData}
        placeholder={placeholder}
        title={r?.title || placeholder}
        url={r?.url || ''}
      />
      {/* Notes */}
      <TextInput
        multiline={true}
        numberOfLines={4}
        placeholder="Add a caption for your profile"
        onChangeText={setCurrentRefComment}
        style={{
          backgroundColor: c.white,
          borderRadius: s.$075,
          width: '100%',
          padding: s.$1,
          minHeight: s.$12,
          // minHeight: 2000,
        }}
      />
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {!currentRef?.url && (
          <Button
            title="Create List"
            variant="outlineFluid"
            style={{ width: '48%', minWidth: 0 }}
            disabled={!pinataSource || !currentRef?.title}
            onPress={() => {
              console.log('ABOUT TO ADD A LIST')
              submit({ list: true })
            }}
          />
        )}
        <Button
          title="Add Ref"
          variant="fluid"
          style={{ width: currentRef.url ? '100%' : '48%', minWidth: 0 }}
          disabled={!pinataSource || !currentRef?.title}
          onPress={() => submit()}
        />
      </View>
    </View>
  )
}
