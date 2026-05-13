import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SortKey = 'lastCommit' | 'name' | 'language' | 'custom'
type ViewMode = 'card' | 'list'
type FilterStatus = 'active' | 'archived' | 'all'

const RECENT_LIMIT = 5

interface WorkspaceFilterSnapshot {
  filterTags: string[]
  filterLanguage: string | null
  filterStatus: FilterStatus
  sortKey: SortKey
  viewMode: ViewMode
}

const DEFAULT_SNAPSHOT: WorkspaceFilterSnapshot = {
  filterTags: [],
  filterLanguage: null,
  filterStatus: 'active',
  sortKey: 'lastCommit',
  viewMode: 'card',
}

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
  // Per-workspace な絞り込み/ソート/表示モードの保存場所と、
  // 現在アクティブな workspaceId（同期用）
  activeWorkspaceKey: string | null
  filtersByWorkspace: Record<string, WorkspaceFilterSnapshot>
  hydrateWorkspace: (workspaceId: string | null) => void
}

function takeSnapshot(state: AppStore): WorkspaceFilterSnapshot {
  return {
    filterTags: state.filterTags,
    filterLanguage: state.filterLanguage,
    filterStatus: state.filterStatus,
    sortKey: state.sortKey,
    viewMode: state.viewMode,
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      // 現在の workspace のスナップショットを更新する
      const stashCurrent = (state: AppStore): Partial<AppStore> => {
        if (!state.activeWorkspaceKey) return {}
        return {
          filtersByWorkspace: {
            ...state.filtersByWorkspace,
            [state.activeWorkspaceKey]: takeSnapshot(state),
          },
        }
      }

      return {
        selectedRepoId: null,
        setSelectedRepoId: (id) => set({ selectedRepoId: id }),
        filterTags: DEFAULT_SNAPSHOT.filterTags,
        setFilterTags: (tags) =>
          set((s) => ({ filterTags: tags, ...stashCurrent({ ...s, filterTags: tags }) })),
        filterLanguage: DEFAULT_SNAPSHOT.filterLanguage,
        setFilterLanguage: (lang) =>
          set((s) => ({ filterLanguage: lang, ...stashCurrent({ ...s, filterLanguage: lang }) })),
        filterStatus: DEFAULT_SNAPSHOT.filterStatus,
        setFilterStatus: (status) =>
          set((s) => ({ filterStatus: status, ...stashCurrent({ ...s, filterStatus: status }) })),
        sortKey: DEFAULT_SNAPSHOT.sortKey,
        setSortKey: (key) =>
          set((s) => ({ sortKey: key, ...stashCurrent({ ...s, sortKey: key }) })),
        viewMode: DEFAULT_SNAPSHOT.viewMode,
        setViewMode: (mode) =>
          set((s) => ({ viewMode: mode, ...stashCurrent({ ...s, viewMode: mode }) })),
        commandPaletteOpen: false,
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        recentRepoIds: [],
        pushRecentRepo: (id) =>
          set((state) => {
            const next = [id, ...state.recentRepoIds.filter((rid) => rid !== id)].slice(0, RECENT_LIMIT)
            return { recentRepoIds: next }
          }),
        clearRecentRepos: () => set({ recentRepoIds: [] }),
        activeWorkspaceKey: null,
        filtersByWorkspace: {},
        hydrateWorkspace: (workspaceId) => {
          const current = get()
          if (current.activeWorkspaceKey === workspaceId) return
          // 直前 workspace の状態を退避してから、新 workspace のスナップショットで上書き
          const stashed = current.activeWorkspaceKey
            ? {
                ...current.filtersByWorkspace,
                [current.activeWorkspaceKey]: takeSnapshot(current),
              }
            : current.filtersByWorkspace
          const next: WorkspaceFilterSnapshot =
            (workspaceId && stashed[workspaceId]) || DEFAULT_SNAPSHOT
          set({
            activeWorkspaceKey: workspaceId,
            filtersByWorkspace: stashed,
            ...next,
          })
        },
      }
    },
    {
      name: 'repo-naut-ui-state',
      version: 2,
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortKey: state.sortKey,
        recentRepoIds: state.recentRepoIds,
        filtersByWorkspace: state.filtersByWorkspace,
        activeWorkspaceKey: state.activeWorkspaceKey,
      }),
    },
  ),
)
