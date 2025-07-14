import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ReportsPage() {
  const [clients, setClients] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    const { data } = await supabase.from('Clients').select('id, first_name, last_name');
    if (data) setClients(data);
  }

  async function fetchSurveys(clientId) {
    const { data } = await supabase
      .from('Surveys')
      .select('id, title')
      .eq('client_id', clientId);
    if (data) setSurveys(data);
  }

  useEffect(() => {
    if (selectedClient) fetchSurveys(selectedClient);
  }, [selectedClient]);

  async function fetchReport() {
    if (!selectedSurvey) return;
    setLoading(true);
    setReportData([]);

    const { data: modules } = await supabase
      .from('Modules')
      .select('id')
      .eq('survey_id', selectedSurvey);
    if (!modules?.length) return setLoading(false);

    const moduleIds = modules.map((m) => m.id);

    const { data: responses } = await supabase
      .from('ModuleResponses')
      .select('*')
      .in('module_id', moduleIds)
      .eq('completed', true);
    if (!responses?.length) return setLoading(false);

    const sessionToModules = {};
    responses.forEach((r) => {
      if (!sessionToModules[r.user_session_id]) sessionToModules[r.user_session_id] = new Set();
      sessionToModules[r.user_session_id].add(r.module_id);
    });

    const validSessions = Object.entries(sessionToModules)
      .filter(([_, mods]) => mods.size === 1)
      .map(([sid]) => sid);

    const filteredResponses = responses.filter(r => validSessions.includes(r.user_session_id));

    const moduleCounts = {};
    filteredResponses.forEach(r => {
      if (!moduleCounts[r.module_id]) moduleCounts[r.module_id] = new Set();
      moduleCounts[r.module_id].add(r.user_session_id);
    });

    const minCount = Math.min(...Object.values(moduleCounts).map(set => set.size));
    const limitedSessions = new Set();

    Object.values(moduleCounts).forEach(set => {
      Array.from(set).slice(0, minCount).forEach(sid => limitedSessions.add(sid));
    });

    const finalResponses = filteredResponses.filter(r => limitedSessions.has(r.user_session_id) && r.gender && r.age);

    const normalizeAge = (age) => {
      const val = age?.replace('--', '–').replace('-', '–').trim();
      return ['18–24', '25–34', '35–44', '45+'].includes(val) ? val : null;
    };

    const responsesByQuestion = {};
    const comboLabels = new Set();

    finalResponses.forEach(({ question_text, selected_answer, age, gender }) => {
      const ageNorm = normalizeAge(age);
      const combo = gender && ageNorm ? `${gender[0]} ${ageNorm}` : null;
      if (!question_text || !selected_answer || !combo) return;

      comboLabels.add(combo);
      responsesByQuestion[question_text] ||= [];
      responsesByQuestion[question_text].push({ answer: selected_answer, combo });
    });

    const final = Object.entries(responsesByQuestion).map(([question, responses]) => {
      const columns = Array.from(comboLabels).sort();
      const countsByAnswer = {};
      const comboTotals = {};
      const answerTotals = {};

      responses.forEach(({ answer, combo }) => {
        countsByAnswer[answer] ||= {};
        countsByAnswer[answer][combo] = (countsByAnswer[answer][combo] || 0) + 1;
        comboTotals[combo] = (comboTotals[combo] || 0) + 1;
        answerTotals[answer] = (answerTotals[answer] || 0) + 1;
      });

      const answers = Object.entries(countsByAnswer).map(([answer, groupCounts]) => {
        const byGroup = {};
        let total = 0;
        columns.forEach(col => {
          const count = groupCounts[col] || 0;
          total += count;
          const colTotal = comboTotals[col] || 1;
          const percent = ((count / colTotal) * 100).toFixed(1);
          byGroup[col] = { count, percent };
        });
        return { answer, total, byGroup };
      });

      const columnTotalsRow = {
        answer: 'TOTAL',
        total: answers.reduce((acc, ans) => acc + ans.total, 0),
        byGroup: {}
      };

      columns.forEach(col => {
        const colSum = answers.reduce((acc, ans) => acc + (ans.byGroup[col]?.count || 0), 0);
        columnTotalsRow.byGroup[col] = { count: colSum, percent: '100.0' };
      });

      answers.push(columnTotalsRow);

      return { question, answers, columns };
    });

    setReportData(final);
    setLoading(false);
  }

  function downloadCSV() {
    if (reportData.length === 0) return;

    const csvRows = [];
    reportData.forEach(({ question, answers, columns }) => {
      csvRows.push([`Question: ${question}`]);
      const header = ['Answer Option', 'Total', ...columns];
      csvRows.push(header);

      answers.forEach(({ answer, total, byGroup }) => {
        const row = [answer, total];
        columns.forEach((col) => {
          const cell = byGroup[col];
          row.push(cell ? `${cell.count} (${cell.percent}%)` : '0 (0.0%)');
        });
        csvRows.push(row);
      });

      csvRows.push([]);
    });

    const csv = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivoted_survey_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📊 Survey Reports</h1>
      <div className="mb-4 flex gap-4">
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          <option value="">Select Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>
        <select value={selectedSurvey} onChange={(e) => setSelectedSurvey(e.target.value)}>
          <option value="">Select Survey</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <button onClick={fetchReport} className="bg-blue-600 text-white px-4 py-1 rounded">
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={reportData.length === 0}
        >
          Download CSV
        </button>
      </div>

      {reportData.map(({ question, answers, columns }, qIdx) => (
        <div key={qIdx} className="bg-white shadow-md rounded p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Q{qIdx + 1}: {question}</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Answer Option</th>
                <th className="border p-2 text-left">Total</th>
                {columns.map((col) => (
                  <th key={col} className="border p-2 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answers.map((ans, aIdx) => {
                return (
                  <tr key={aIdx}>
                    <td className={`border p-2 font-medium ${ans.answer === 'TOTAL' ? 'font-bold bg-gray-100' : ''}`}>{ans.answer}</td>
                    <td className={`border p-2 ${ans.answer === 'TOTAL' ? 'font-bold bg-gray-100' : ''}`}>{ans.total}</td>
                    {columns.map((col) => {
                      const cell = ans.byGroup[col];
                      const maxPercent = Math.max(...answers.filter(a => a.answer !== 'TOTAL').map(a => parseFloat(a.byGroup[col]?.percent || 0)));
                      const isMax = parseFloat(cell?.percent) === maxPercent;
                      const highlight = isMax && ans.answer !== 'TOTAL';
                      return (
                        <td key={col} className={`border p-2 ${highlight ? 'font-bold bg-yellow-100' : ''} ${ans.answer === 'TOTAL' ? 'font-bold bg-gray-100' : ''}`}>
                          {cell ? `${cell.count} (${cell.percent}%)` : '0 (0.0%)'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
