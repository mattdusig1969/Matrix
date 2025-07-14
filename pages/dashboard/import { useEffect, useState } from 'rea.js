import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_key_here'
);

export default function ModuleCompletionMeter({ surveyId, targetN }) {
  const [completionCount, setCompletionCount] = useState(0);
  const [completionPercent, setCompletionPercent] = useState(0);

  useEffect(() => {
    const loadCompletion = async () => {
      const { data, error } = await supabase.rpc('get_survey_completion_count', {
        survey_id_input: surveyId
      });
      if (!error) {
        setCompletionCount(data);
        setCompletionPercent(Math.round((data / targetN) * 100));
      }
    };

    loadCompletion();

    const channel = supabase
      .channel('module_responses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ModuleResponses',
          filter: `survey_id=eq.${surveyId}`
        },
        loadCompletion
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [surveyId, targetN]);

  return (
    <div className="bg-white p-4 shadow rounded-md border">
      <h5 className="text-md font-semibold mb-2">Module Completion</h5>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-green-500 h-4 rounded-full"
          style={{ width: `${completionPercent}%` }}
        ></div>
      </div>
      <p className="mt-2 text-sm text-gray-700">
        {completionCount} of {targetN} completes ({completionPercent}%)
      </p>
    </div>
  );
}
