import { useState, type ReactNode } from "react";

/** One tab: its button label and what it shows when selected. */
export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Underlined tabs, adapted from TailAdmin's `TabWithUnderline` (same classes) to take real content.
 * The first tab is selected at the start. Only the selected tab's content is rendered.
 */
export default function Tabs({ tabs }: { tabs: TabItem[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav role="tablist" className="-mb-px flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === active?.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(tab.id)}
                className={`inline-flex items-center border-b-2 px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-in-out ${
                  isActive
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent bg-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div role="tabpanel" className="pt-4">
        {active?.content}
      </div>
    </div>
  );
}
