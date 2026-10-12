import {
  HomepageEducationLoading,
  HomepageFeaturedWorksLoading,
  HomepageOpenSourceLoading,
  HomepageProfileLoading,
  HomepageTechStackLoading,
} from '@/features/public';
import { HomepageShell } from '@/widgets/public/homepage-content/ui/homepage-shell';

/** The homepage's blocks, in the same order and spacing as `HomepageContent`. */
export default function HomeLoading() {
  return (
    <HomepageShell aria-busy="true">
      <div className="space-y-12 md:space-y-16">
        <HomepageProfileLoading />
        <HomepageFeaturedWorksLoading />
        <HomepageOpenSourceLoading />
        <HomepageEducationLoading />
        <HomepageTechStackLoading />
      </div>
    </HomepageShell>
  );
}
