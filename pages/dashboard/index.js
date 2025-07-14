import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function DashboardPage() {
  const [surveySummaries, setSurveySummaries] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Live');
  const [clientFilter, setClientFilter] = useState('All');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [clientNames, setClientNames] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const [{ data: surveys }, { data: modules }, { data: questions }, { data: responses }, { data: clients }] = await Promise.all([
        supabase.from('Surveys').select('*'),
        supabase.from('Modules').select('*'),
        supabase.from('questions').select('module_id'),
        supabase.from('ModuleResponses').select('*'),
        supabase.from('Clients').select('id, first_name, last_name')
      ]);

      setClientNames(clients);

      const summaries = surveys.map((survey) => {
        const client = clients.find(c => c.id === survey.client_id);
        const client_name = client ? `${client.first_name} ${client.last_name}` : 'N/A';

        const surveyModules = modules.filter(m => m.survey_id === survey.id);
        const moduleIds = surveyModules.map(m => m.id);
        const surveyQuestions = questions.filter(q => moduleIds.includes(q.module_id));
        const surveyResponses = responses.filter(r => moduleIds.includes(r.module_id));
        const uniqueRespondents = new Set(surveyResponses.map(r => r.user_session_id));

        const completesPerModule = surveyModules.map((mod) => {
          const completes = surveyResponses.filter(r => r.module_id === mod.id && r.completed);
          const sessionIds = new Set(completes.map(r => r.user_session_id));
          return sessionIds.size;
        });

        const nComplete = completesPerModule.length > 0 ? Math.min(...completesPerModule) : 0;

        const sessionToModules = {};
        surveyModules.forEach((mod) => {
          const completes = surveyResponses.filter(r => r.module_id === mod.id && r.completed);
          completes.forEach((r) => {
            if (!sessionToModules[r.user_session_id]) sessionToModules[r.user_session_id] = new Set();
            sessionToModules[r.user_session_id].add(mod.id);
          });
        });

        const validSessions = Object.entries(sessionToModules)
          .filter(([_, mods]) => mods.size === 1)
          .map(([sessionId]) => sessionId);

        const limitedSessionIds = validSessions.slice(0, nComplete);

        const targetingCounts = {};
        const targeting = survey.targeting || {};

        Object.entries(targeting).forEach(([field, values]) => {
          targetingCounts[field] = {};
          values.forEach((val) => {
            targetingCounts[field][val] = limitedSessionIds.reduce((acc, sessionId) => {
              const r = surveyResponses.find(res => res.user_session_id === sessionId && res.completed);
              return r?.[field] === val ? acc + 1 : acc;
            }, 0);
          });
        });

        return {
          ...survey,
          client_name,
          questionCount: surveyQuestions.length,
          moduleCount: surveyModules.length,
          responseCount: surveyResponses.length,
          uniqueRespondentCount: uniqueRespondents.size,
          completeCount: nComplete,
          n_target: survey.target_n ?? 'N/A',
          targetingCounts
        };
      });

      setSurveySummaries(summaries);
    }

    fetchData();
  }, []);

  const filteredSortedSurveys = surveySummaries
    .filter(s => statusFilter === 'All' || s.status === statusFilter)
    .filter(s => clientFilter === 'All' || s.client_id === clientFilter)
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      return (new Date(a[sortField]) - new Date(b[sortField])) * dir;
    });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">📊 Survey Dashboard</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ml-2 border px-2 py-1 rounded">
            {['All', 'Live', 'Paused', 'Closed', 'Completed'].map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Client:</label>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="ml-2 border px-2 py-1 rounded">
            <option value="All">All</option>
            {clientNames.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">Sort by:</label>
          <div className="flex items-center gap-3">
            <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border px-2 py-1 rounded">
              <option value="created_at">Date Created</option>
              <option value="client_name">Client Name</option>
              <option value="title">Survey Title</option>
            </select>

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-2 py-1 border rounded">
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>

            <button onClick={() => window.location.href = '/dashboard/surveys/create'} className="bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap">
              + Create Survey
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredSortedSurveys.map((s, idx) => (
          <div key={idx} className="bg-white shadow rounded p-6">
            <h2 className="text-xl font-semibold mb-2">
              <a href={`/dashboard/surveys/${s.id}/general`} className="text-blue-600 hover:underline">{s.title}</a>
            </h2>

            <p className="text-sm text-gray-500 mb-4">Client: {s.client_name} | Created: {new Date(s.created_at).toLocaleDateString()}</p>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p>🌾 Questions: <strong>{s.questionCount}</strong></p>
                <p>📦 Modules: <strong>{s.moduleCount}</strong></p>
                <p>📊 Questions Answered: <strong>{s.responseCount}</strong></p>
                <p>🙋 Unique Respondents: <strong>{s.uniqueRespondentCount}</strong></p>
                <p>🎯 Target N: <strong>{s.n_target}</strong></p>
                <p>✅ N Complete: <strong>{s.completeCount}</strong></p>
              </div>

              {Object.entries(s.targetingCounts || {}).map(([field, valueCounts]) => (
                <div key={field}>
                  <h3 className="font-bold capitalize">🧩 {field.replace(/_/g, ' ')}</h3>
                  {Object.entries(valueCounts).map(([val, count]) => (
                    <p key={val}>{val}: {count}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                s.status === 'Live' ? 'bg-green-100 text-green-800' :
                s.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
