import { useRef, useEffect } from 'react'
import { Plus, Settings, Search, X, Archive } from 'lucide-react'
import { IconButton } from '../common/IconButton'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useSettingsStore } from '../../store/settingsStore'

export function SidebarActions() {
  const startAddingProject = useUIStore((s) => s.startAddingProject)
  const conversationFilter = useUIStore((s) => s.conversationFilter)
  const setConversationFilter = useUIStore((s) => s.setConversationFilter)
  const searchOpen = useProjectStore((s) => s.searchOpen)
  const searchQuery = useProjectStore((s) => s.searchQuery)
  const toggleSearch = useProjectStore((s) => s.toggleSearch)
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery)
  const showArchived = useProjectStore((s) => s.showArchived)
  const toggleShowArchived = useProjectStore((s) => s.toggleShowArchived)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus()
    }
  }, [searchOpen])

  const filters = ['all', 'unanswered', 'working', 'unread'] as const

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          Projects
        </span>
        <div className="flex gap-0.5">
          <IconButton
            tooltip={showArchived ? 'Hide archived' : 'Show archived'}
            onClick={toggleShowArchived}
            className={showArchived ? 'bg-accent/15 text-accent hover:bg-accent/25 hover:text-accent' : ''}
          >
            <Archive size={14} />
          </IconButton>
          <IconButton
            tooltip={searchOpen ? 'Close search' : 'Search'}
            onClick={toggleSearch}
            className={searchOpen ? 'bg-accent/15 text-accent hover:bg-accent/25 hover:text-accent' : ''}
          >
            <Search size={14} />
          </IconButton>
          <IconButton tooltip="New project" onClick={startAddingProject}>
            <Plus size={14} />
          </IconButton>
          <IconButton tooltip="Settings" onClick={toggleSettings}>
            <Settings size={14} />
          </IconButton>
        </div>
      </div>
      {searchOpen ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') toggleSearch()
            }}
            placeholder="Search projects & sessions..."
            className="w-full rounded bg-surface-2 px-2 py-1 pr-6 text-[11px] text-text-primary placeholder-text-secondary outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex rounded bg-surface-2 p-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setConversationFilter(f)}
              className={`flex-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                conversationFilter === f
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unanswered' ? 'Pending' : f === 'working' ? 'Working' : 'Unread'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
