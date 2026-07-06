"use client";

import { useState } from "react";
import { ManagementFilterProvider } from "@/lib/management-filter-context";
import YearSlicer from "./YearSlicer";

export type DashboardSection = {
  id: string;
  label: string;
  content: React.ReactNode;
  usesYearFilter?: boolean;
};

export default function Dashboard({
  sections,
  availableYears,
}: {
  sections: DashboardSection[];
  availableYears: number[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <ManagementFilterProvider availableYears={availableYears}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-navy-800 mb-6">Management</h1>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-sand-200 pb-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                s.id === active?.id
                  ? "bg-navy-800 text-white"
                  : "bg-white text-gray-600 border border-sand-200 hover:border-navy-800 hover:text-navy-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {active?.usesYearFilter && <YearSlicer />}

        <div>{active?.content}</div>
      </div>
    </ManagementFilterProvider>
  );
}
