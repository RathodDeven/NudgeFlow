import { cn } from '@/lib/utils'
import { LayoutDashboard, LogOut, Menu, Settings, Users, X, Layers, MessageSquare } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  className?: string
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  useWhatsapp?: boolean
  onToggleWhatsapp?: (value: boolean) => void
}

export function Sidebar({
  className,
  activeTab,
  setActiveTab,
  onLogout,
  useWhatsapp,
  onToggleWhatsapp
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isSandbox = import.meta.env.VITE_ENABLE_SANDBOX === 'true'

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
            {isSandbox && (
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold">WhatsApp API</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleWhatsapp?.(!useWhatsapp)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      useWhatsapp ? 'bg-primary' : 'bg-input'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                        useWhatsapp ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  {useWhatsapp ? 'Using real WhatsApp' : 'Using Simulator and sandbox DB'}
                </p>
              </div>
            )}
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
