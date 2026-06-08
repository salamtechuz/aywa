import { getTranslations } from "next-intl/server";

import { CalendarShell } from "@/components/calendar/calendar-shell";
import { PageHeader } from "@/components/patterns/page-header";
import { listCalendarEvents } from "@/lib/calendar/queries";
import { getActiveWorkspace } from "@/lib/tenant";

export const metadata = { title: "Calendar" };

type SearchParams = { month?: string };

function parseMonth(raw: string | undefined): Date {
  // raw is YYYY-MM (UTC-naive). Default to current local month.
  const now = new Date();
  if (!raw) return new Date(now.getFullYear(), now.getMonth(), 1);
  const match = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (!match) return new Date(now.getFullYear(), now.getMonth(), 1);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(year, month, 1);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ws = await getActiveWorkspace();
  const t = await getTranslations("calendar");
  const params = await searchParams;
  const cursor = parseMonth(params.month);

  // Pre-fetch a wide window (cursor month +/- 1) so the agenda has lookahead context.
  const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1);
  const events = await listCalendarEvents(ws.id, from, to);

  // Serialize Dates to strings for the client boundary.
  const serialized = events.map((e) => ({
    ...e,
    date: e.date.toISOString(),
  }));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="p-4 md:p-6">
        <CalendarShell month={cursor.toISOString()} events={serialized} />
      </div>
    </>
  );
}
