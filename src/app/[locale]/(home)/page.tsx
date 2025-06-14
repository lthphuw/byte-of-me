
import { GreetingWriter } from "@/components/greeting-writer";
import { ProfileBanner } from "@/components/profile-banner";
import { ProfileQuote } from "@/components/profile-quote";
import { HomeShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { absoluteUrl, cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";

async function getMe() {
  const res = await fetch(absoluteUrl(`/api/users/me`), {
    cache: "no-store",
  })
  if (!res.ok) {
    return null
  }
  return res.json()
}

export default async function HomePage() {
  const me = await getMe();

  return (
    <HomeShell>
      {/* Heading */}
      <GreetingWriter text={`Hi, I'm ${me.firstName}`} />

      {/* Tagline */}
      <p className="mb-2 text-base text-muted-foreground md:text-lg">
        {me.tagLine}
      </p>

      <ProfileBanner
        src={me.image}
        alt={me.imageCaption}
        caption={me.imageCaption}
      />
      <ProfileQuote quote={me.quote} />

      <div className="flex flex-col flex-wrap gap-4 md:flex-row">
        <Link href="/projects">
          <Button className="w-full py-3 text-lg md:w-auto md:py-2 md:text-base">See my work</Button>
        </Link>
        <Link href="/about">
          <Button variant="secondary" className={cn("w-full gap-1 py-3 text-lg md:w-auto md:py-2 md:text-base")}>
            <FileText />
            <span>README</span>
          </Button>
        </Link>
      </div>
    </HomeShell>

  )
}
