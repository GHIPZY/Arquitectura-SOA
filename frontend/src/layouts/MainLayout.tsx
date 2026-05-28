import { ReactNode } from 'react'
import { Sidebar } from '@/shared/components/Sidebar'
import { TopBar } from '@/shared/components/TopBar'

interface MainLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  extra?: React.ReactNode
}

export function MainLayout({ children, title, subtitle, extra }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-base flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-56 min-h-screen">
        <TopBar title={title} subtitle={subtitle} extra={extra} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
