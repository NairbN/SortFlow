"use client";

import { createContext, useContext } from "react";

/**
 * A single "today" computed once, server-side (see app/(app)/layout.tsx),
 * and threaded through Context rather than each card calling `new Date()`
 * itself. OrderCard/KanbanCard are Client Components that also render
 * during SSR - if each called `new Date()` independently, the server's
 * clock and the viewer's local clock could disagree on the calendar date
 * (e.g. already tomorrow in UTC but not yet locally), producing a
 * different days-left number on the server-rendered HTML vs. the client's
 * hydration pass and triggering a React hydration mismatch. A shared value
 * also means every viewer sees the same "9d overdue," not one that shifts
 * with their own timezone - more correct for a tool the whole team shares.
 */
const TodayContext = createContext<string | null>(null);

export function TodayProvider({
  today,
  children,
}: {
  today: string;
  children: React.ReactNode;
}) {
  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}

export function useToday(): string {
  const today = useContext(TodayContext);
  if (today === null) {
    throw new Error("useToday must be used within a TodayProvider");
  }
  return today;
}
