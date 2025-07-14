import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ModuleCompletionMeter({ surveyId, targetN }) {
  const [moduleCounts, setModuleCounts] = useState([]);

  useEffect(() => {
    if (!surveyId) return;
    fetchProgress();
    const interval = setInterval(fetchProgress, 3000);
    return () => clearInterval(interval);
  }, [surveyId]);

  async function fetchProgress() {
    const { data: modules } = await supabase
      .from('Modules')
      .select('id')
      .eq('survey_id', surveyId);

    if (!modules) return;

    const results = await Promise.all(
      modules.map(async (mod) => {
        const { count } = await supabase
          .from('ModuleResponses')
          .select('user_session_id', { count: 'exact', head: true })
          .eq('module_id', mod.id)
          .eq('completed', true);

        return {
          moduleId: mod.id,
          count: count || 0,
        };
      })
    );

    setModuleCounts(results);
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Module Completion Meters</h3>
      {moduleCounts.map(({ moduleId, count }) => {
        const percent = Math.min(100, ((count / targetN) * 100).toFixed(1));
        return (
          <div key={moduleId} className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-1">Module: {moduleId}</div>
            <div className="w-full bg-gray-200 rounded h-4">
              <div
                className="bg-green-600 h-4 rounded"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{count}/{targetN} completes ({percent}%)</div>
          </div>
        );
      })}
    </div>
  );
}
