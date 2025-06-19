import { createContext, ReactNode, useState } from 'react'
import { createStore, StoreApi } from 'zustand'

type ProfileDetailsState = {
  currentIndex: number
  setCurrentIndex: (newCurrentIndex: number) => void
  showContextMenu: boolean
  setShowContextMenu: (newShowContextMenu: boolean) => void
  isEditing: boolean
  setIsEditing: (newValue: boolean) => void
  openedFromFeed: boolean
  editingRights: boolean
}

// define a "profile store"
// which is created once every time you open the details modal
export const ProfileDetailsContext = createContext<StoreApi<ProfileDetailsState>>(
  undefined as unknown as StoreApi<ProfileDetailsState>
)

export const ProfileDetailsProvider = ({
  children,
  initialIndex,
  openedFromFeed,
  editingRights,
}: {
  children: ReactNode
  initialIndex: number
  openedFromFeed: boolean
  editingRights: boolean
}) => {
  const [profileDetailsStore] = useState(() =>
    createStore<ProfileDetailsState>((set) => ({
      currentIndex: initialIndex,
      setCurrentIndex: (newCurrentIndex) => set({ currentIndex: newCurrentIndex }),
      showContextMenu: false,
      setShowContextMenu: (newShowContextMenu) => set({ showContextMenu: newShowContextMenu }),
      isEditing: false,
      setIsEditing: (newIsEditing) => set({ isEditing: newIsEditing }),
      openedFromFeed,
      editingRights,
    }))
  )

  return (
    <ProfileDetailsContext.Provider value={profileDetailsStore}>
      {children}
    </ProfileDetailsContext.Provider>
  )
}
