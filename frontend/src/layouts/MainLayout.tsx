import { ReactNode } from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { TopBar } from '@/shared/components/TopBar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        {/* TopBar */}
        <TopBar />

        {/* Contenido dinámico */}
        <main
          className="
            flex-1
            p-6
            overflow-y-auto
            bg-background
          "
        >
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}