import React from "react";
import RecentActivitySection from "../components/common/RecentActivitySection";

export default function History() {
  return (
    <div className="flex flex-col h-full relative w-full overflow-y-auto no-scrollbar pb-10">
      <div className="max-w-6xl mx-auto w-full py-4">
        <RecentActivitySection
          title="Creative Archive & Recent Activity"
          subtitle="Explore, search, resume projects, download media, and manage your assets"
          maxItems={200}
        />
      </div>
    </div>
  );
}
