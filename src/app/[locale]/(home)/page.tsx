import { GreetingWriter } from "@/components/greeting-writer";
import { ProfileBanner } from "@/components/profile-banner";
import { ProfileQuote } from "@/components/profile-quote";
import { HomeShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { User } from "@/generated/prisma/client";
import { fetchData } from "@/lib/fetch";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

// Next.js will invalidate the cache when a
// request comes in, at most once every 60 seconds.
export const revalidate = 86400

// We'll prerender only the params from `generateStaticParams` at build time.
// If a request comes in for a path that hasn't been generated,
// Next.js will server-render the page on-demand.
export const dynamicParams = true // or false, to 404 on unknown paths

export default async function HomePage() {
  const t = await getTranslations("home");
  const user = await fetchData<User>('me');
  
  return (
    <HomeShell>
      {/* Heading */}
      <GreetingWriter text={user.greeting || ""} />

      {/* Tagline */}
      <p className="mb-2 text-base text-muted-foreground md:text-lg">
        {user?.tagLine || ""}
      </p>

      <ProfileBanner
        images={(user as any)?.bannerImages}
      />
      <ProfileQuote quote={user?.quote || ""} />

      <div className="flex flex-col flex-wrap gap-4 md:flex-row">
        <Link href="/projects">
          <Button className="w-full py-3 text-lg md:w-auto md:py-2 md:text-base">
            {t("See my work")}
          </Button>
        </Link>
        <Link href="/about">
          <Button
            variant="secondary"
            className={cn("w-full gap-1 py-3 text-lg md:w-auto md:py-2 md:text-base")}
          >
            <FileText />
            <span>{t("README")}</span>
          </Button>
        </Link>
      </div>
    </HomeShell>
  );
}