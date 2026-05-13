import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SortKey = 'lastCommit' | 'name' | 'language'
type ViewMode = 'card' | 'list'
type FilterStatus = 'active' | 'archived' | 'all'

const RECENT_LIMIT = 5

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
  recentRepoIds: string[]
  pushRecentRepo: (id: string) => void
  clearRecentRepos: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
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
      recentRepoIds: [],
      pushRecentRepo: (id) =>
        set((state) => {
          const next = [id, ...state.recentRepoIds.filter((rid) => rid !== id)].slice(0, RECENT_LIMIT)
          return { recentRepoIds: next }
        }),
      clearRecentRepos: () => set({ recentRepoIds: [] }),
    }),
    {
      name: 'repo-naut-ui-state',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortKey: state.sortKey,
        recentRepoIds: state.recentRepoIds,
      }),
    },
  ),
)
