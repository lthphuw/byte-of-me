
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

interface HomeLayoutProps {
  children?: React.ReactNode
}

export default async function HomeLayout({
  children,
}: HomeLayoutProps) {

  return (
    <div className="flex relative min-h-screen flex-col overflow-hidden">
      <SiteHeader />

      <div className="container grid flex-1 gap-12">
        <main className="flex w-full flex-1 flex-col">
          {children}
        </main>
      </div>

      <SiteFooter className="border-t" />
    </div>
  )
}
