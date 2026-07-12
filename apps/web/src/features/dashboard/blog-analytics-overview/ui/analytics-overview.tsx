import { Card, CardContent, CardHeader, CardTitle } from '@byte-of-me/ui';
import { Eye, Hand, Heart } from 'lucide-react';

import { getAnalyticsOverview } from '@/features/dashboard/blog-analytics-overview/lib';

const DAY_LABEL_INTERVAL = 5;

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function dayOfMonth(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDate();
}

export async function AnalyticsOverview() {
  const dataResp = await getAnalyticsOverview();
  if (!dataResp.success || !dataResp.data) {
    return null;
  }
  const { viewsByDay, totalViewsLast30Days, topBlogs, likes, claps, pageViews } =
    dataResp.data;

  const maxDailyViews = Math.max(...viewsByDay.map((d) => d.views), 1);
  const maxTopBlogViews = Math.max(...topBlogs.map((b) => b.views), 1);

  const tiles = [
    { label: 'Likes', value: likes, sub: 'All time', icon: Heart },
    { label: 'Claps', value: claps, sub: 'All time', icon: Hand },
    {
      label: 'Page Views',
      value: pageViews.total,
      sub: `${pageViews.last30Days} in last 30 days`,
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-none bg-card/60 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Views — last 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalViewsLast30Days === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No views yet
              </p>
            ) : (
              <div>
                <div className="flex h-36 items-end gap-0.5">
                  {viewsByDay.map((d) => (
                    <div
                      key={d.date}
                      role="img"
                      title={`${formatDay(d.date)}: ${d.views} views`}
                      aria-label={`${formatDay(d.date)}: ${d.views} views`}
                      className={`flex-1 rounded-t ${
                        d.views > 0 ? 'bg-primary' : 'bg-muted'
                      }`}
                      style={{
                        height:
                          d.views > 0
                            ? `${Math.max((d.views / maxDailyViews) * 100, 3)}%`
                            : '2px',
                      }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex gap-0.5" aria-hidden="true">
                  {viewsByDay.map((d, i) => (
                    <span
                      key={d.date}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                    >
                      {i % DAY_LABEL_INTERVAL === 0 ? dayOfMonth(d.date) : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-card/60 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Top posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBlogs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No views yet
              </p>
            ) : (
              <ol className="space-y-4">
                {topBlogs.map((blog, i) => (
                  <li key={blog.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium">
                        <span className="mr-2 text-xs font-semibold text-muted-foreground">
                          {i + 1}.
                        </span>
                        {blog.title}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {blog.views}
                      </span>
                    </div>
                    <div
                      role="img"
                      title={`${blog.title}: ${blog.views} views`}
                      aria-label={`${blog.title}: ${blog.views} views`}
                      className="h-2 w-full overflow-hidden rounded-full bg-primary/20"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            (blog.views / maxTopBlogViews) * 100,
                            2
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card
            key={t.label}
            className="border-none bg-card/60 shadow-sm backdrop-blur-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t.label}
              </CardTitle>
              <t.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{t.value}</div>
              <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">
                {t.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
