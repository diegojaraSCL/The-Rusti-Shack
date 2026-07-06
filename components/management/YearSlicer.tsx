"use client";

import { ALL_YEARS, useManagementFilter } from "@/lib/management-filter-context";

export default function YearSlicer() {
  const { selectedYear, setSelectedYear, availableYears } = useManagementFilter();

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setSelectedYear(ALL_YEARS)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedYear === ALL_YEARS
            ? "bg-teal-500 text-white"
            : "bg-white text-gray-600 border border-sand-200 hover:border-teal-500 hover:text-teal-600"
        }`}
      >
        All years
      </button>
      {availableYears.map((year) => (
        <button
          key={year}
          onClick={() => setSelectedYear(String(year))}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedYear === String(year)
              ? "bg-teal-500 text-white"
              : "bg-white text-gray-600 border border-sand-200 hover:border-teal-500 hover:text-teal-600"
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
