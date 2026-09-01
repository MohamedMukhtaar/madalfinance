import { useState } from "react";
import type { MonthValue } from "@/components/ui";
import { currentMonth } from "@/utils/monthFilter";

export function useSelectedMonth(initial?: MonthValue) {
  const [month, setMonth] = useState<MonthValue>(initial ?? currentMonth());
  return { month, setMonth };
}
