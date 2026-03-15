import { cn } from '@/lib/utils'
import { LayoutDashboard, LogOut, Menu, Settings, Users, X, Layers } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  className?: string
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
}

export function Sidebar({ className, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'batches', label: 'Batches', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <>
      <button
        type="button"
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-primary text-primary-foreground rounded-md shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-300 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex flex-col h-full w-full">
          <div className="p-6">
            <h2 className="text-2xl font-bold tracking-tight text-primary">NudgeFlow</h2>
            <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">Ops Dashboard</p>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex items-center w-full px-6 py-3 text-sm font-medium transition-all duration-200 border-l-4 text-left',
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 mr-3 shrink-0',
                      activeTab === item.id ? 'text-primary' : 'text-muted-foreground transition-colors group-hover:text-foreground'
                    )}
                  />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-border">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center w-full px-6 py-4 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors border-l-4 border-transparent"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          onKeyDown={e => e.key === 'Escape' && setIsOpen(false)}
        />
      )}
    </>
  )
}
