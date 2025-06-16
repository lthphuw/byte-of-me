import { GreetingWriter } from "@/components/greeting-writer";
import { ProfileBanner } from "@/components/profile-banner";
import { ProfileQuote } from "@/components/profile-quote";
import { HomeShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";


export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <HomeShell>
      {/* Heading */}
      <GreetingWriter text={t("greeting")} />

      {/* Tagline */}
      <p className="mb-2 text-base text-muted-foreground md:text-lg">
        {t("tagline")}
      </p>

      <ProfileBanner
        src={"/images/avatars/HaNoi2024.jpeg"}
        alt={t("bannerAlt")}
        caption={t("bannerCaption")}
      />
      <ProfileQuote quote={t("quote")} />

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