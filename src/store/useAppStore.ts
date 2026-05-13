import { create } from 'zustand'

type SortKey = 'lastCommit' | 'name' | 'language'
type ViewMode = 'card' | 'list'
type FilterStatus = 'active' | 'archived' | 'all'

interface AppStore {
  selectedRepoId: string | null
  setSelectedRepoId: (id: string | null) => void
  filterTags: string[]
  setFilterTags: (tags: string[]) => void
  filterLanguage: string | null
  setFilterLanguage: (lang: string | null) => void
  filterStatus: FilterStatus
  setFilterStatus: (status: FilterStatus) => void
  sortKey: SortKey
  setSortKey: (key: SortKey) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  selectedRepoId: null,
  setSelectedRepoId: (id) => set({ selectedRepoId: id }),
  filterTags: [],
  setFilterTags: (tags) => set({ filterTags: tags }),
  filterLanguage: null,
  setFilterLanguage: (lang) => set({ filterLanguage: lang }),
  filterStatus: 'active',
  setFilterStatus: (status) => set({ filterStatus: status }),
  sortKey: 'lastCommit',
  setSortKey: (key) => set({ sortKey: key }),
  viewMode: 'card',
  setViewMode: (mode) => set({ viewMode: mode }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}))
