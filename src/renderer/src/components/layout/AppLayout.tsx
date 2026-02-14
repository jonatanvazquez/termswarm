import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { MainArea } from './MainArea'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  return (
    <div className="flex h-full flex-col bg-surface-0">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <MainArea />
      </div>
      <StatusBar />
    </div>
  )
}
