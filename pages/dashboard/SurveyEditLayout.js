// pages/dashboard/SurveyEditLayout.js
import Link from 'next/link';

export default function SurveyEditLayout({ id, currentTab, children }) {
  const tabs = ['General', 'Targeting', 'Quotas', 'Reporting'];

  return (
    <div className="p-10">
      <h1 className="text-xl font-semibold mb-4">📝 Edit Survey</h1>

      <div className="flex space-x-4 border-b mt-4 mb-8">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/dashboard/surveys/${id}/${tab.toLowerCase()}`}
            className={`px-4 py-2 border border-b-0 rounded-t font-semibold ${
              currentTab === tab
                ? 'bg-white text-blue-600 font-bold'
                : 'bg-white text-black'
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      <div className="bg-white shadow p-6 rounded-md">{children}</div>
    </div>
  );
}
