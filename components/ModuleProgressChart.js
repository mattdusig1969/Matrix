// File: components/ModuleProgressChart.js

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer
} from 'recharts';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ModuleProgressChart({ surveyId, targetN }) {
  const [data, setData] = useState([]);

  async function fetchProgress() {
    const { data: modules, error: modErr } = await supabase
      .from('Modules')
      .select('id')
      .eq('survey_id', surveyId);

    if (modErr || !modules) return;

    const progressData = await Promise.all(
      modules.map(async (mod) => {
        const { data, error } = await supabase
          .from('ModuleResponses')
          .select('user_session_id', { count: 'exact', head: false })
          .eq('module_id', mod.id)
          .eq('completed', true);

        const uniqueUsers = new Set(data?.map(r => r.user_session_id)).size;
        const percent = Math.round((uniqueUsers / targetN) * 100);

        return {
          name: mod.name || `Module ${mod.id.slice(0, 4)}`,
          count: uniqueUsers,
          percent
        };
      })
    );

    setData(progressData);
  }

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [surveyId]);

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ left: 40, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" width={100} />
          <Tooltip formatter={(v, n) => (n === 'percent' ? `${v}%` : v)} />
          <Bar dataKey="percent" fill="#f97316">
            <LabelList
              dataKey="percent"
              content={({ x, y, width, height, value, index }) => {
                const label = `${value}% (${data[index].count})`;
                return (
                  <text
                    x={x + width - 5}
                    y={y + height / 2 + 5}
                    textAnchor="end"
                    fill={value > 15 ? 'white' : 'black'}
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
