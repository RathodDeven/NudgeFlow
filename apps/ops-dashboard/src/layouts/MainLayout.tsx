import { Sidebar } from '@/components/Sidebar'
import { useMemo } from 'react'

interface MainLayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  dataError?: string
}

export function MainLayout({ children, activeTab, setActiveTab, onLogout, dataError }: MainLayoutProps) {
  const isProduction = useMemo(() => process.env.NODE_ENV === 'production', [])

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        className="hidden md:flex"
      />

      <div className="flex-1 flex flex-col md:pl-64">
        {/* Top Header / Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 sm:px-8">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  isProduction
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isProduction ? 'bg-red-600' : 'bg-green-600'}`}
                />
                {isProduction ? 'Production' : 'Sandbox'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {dataError && (
                <div className="hidden lg:block text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                  {dataError}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {dataError && (
              <div className="lg:hidden mb-6 p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                {dataError}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
