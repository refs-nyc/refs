import { createContext, ReactNode } from 'react'
import { createStore, StoreApi } from 'zustand'

type ProfileDetailsState = {
  currentIndex: number
  setCurrentIndex: (newCurrentIndex: number) => void
  showContextMenu: boolean
  setShowContextMenu: (newShowContextMenu: boolean) => void
  isEditing: boolean
  setIsEditing: (newValue: boolean) => void
}

// define a "profile store"
// which is created once every time you open the details modal
export const ProfileDetailsContext = createContext<StoreApi<ProfileDetailsState>>(
  undefined as unknown as StoreApi<ProfileDetailsState>
)

export const ProfileDetailsProvider = ({
  children,
  initialIndex,
}: {
  children: ReactNode
  initialIndex: number
}) => {
  const profileDetailsStore = createStore<ProfileDetailsState>((set) => ({
    currentIndex: initialIndex,
    setCurrentIndex: (newCurrentIndex) => set({ currentIndex: newCurrentIndex }),
    showContextMenu: false,
    setShowContextMenu: (newShowContextMenu) => set({ showContextMenu: newShowContextMenu }),
    isEditing: false,
    setIsEditing: (newIsEditing) => set({ isEditing: newIsEditing }),
  }))

  return (
    <ProfileDetailsContext.Provider value={profileDetailsStore}>
      {children}
    </ProfileDetailsContext.Provider>
  )
}
