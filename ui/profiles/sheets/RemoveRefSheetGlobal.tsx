import { useEffect } from 'react'
import { useAppStore } from '@/features/stores'
import { RemoveRefSheet } from './RemoveRefSheet'

export const RemoveRefSheetGlobal = () => {
  const {
    removeRefSheetRef,
    pendingRefRemoval,
    setPendingRefRemoval,
  } = useAppStore()

  // Open sheet when pendingRefRemoval is set
  useEffect(() => {
    if (!pendingRefRemoval) return
    requestAnimationFrame(() => {
      removeRefSheetRef.current?.snapToIndex(0)
    })
  }, [pendingRefRemoval, removeRefSheetRef])

  const handleClose = () => {
    setPendingRefRemoval(null)
  }

  const handleRemoveFromProfile = async () => {
    if (!pendingRefRemoval) return
    removeRefSheetRef.current?.close()
    await pendingRefRemoval.onRemove()
    setPendingRefRemoval(null)
  }

  return (
    <RemoveRefSheet
      bottomSheetRef={removeRefSheetRef}
      handleRemoveFromProfile={handleRemoveFromProfile}
      item={pendingRefRemoval?.item || null}
      onClose={handleClose}
    />
  )
}

