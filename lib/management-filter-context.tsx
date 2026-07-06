"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export const ALL_YEARS = "all";

type ManagementFilterContextType = {
  selectedYear: string; // ALL_YEARS or a 4-digit year string
  setSelectedYear: (year: string) => void;
  availableYears: number[];
};

const ManagementFilterContext = createContext<ManagementFilterContextType | null>(null);

export function ManagementFilterProvider({
  availableYears,
  children,
}: {
  availableYears: number[];
  children: ReactNode;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_YEARS);
  return (
    <ManagementFilterContext.Provider value={{ selectedYear, setSelectedYear, availableYears }}>
      {children}
    </ManagementFilterContext.Provider>
  );
}

export function useManagementFilter() {
  const ctx = useContext(ManagementFilterContext);
  if (!ctx) throw new Error("useManagementFilter must be used inside ManagementFilterProvider");
  return ctx;
}
