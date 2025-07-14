import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ManageSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [clients, setClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Live');
  const [clientFilter, setClientFilter] = useState('All');
  const router = useRouter();

  useEffect(() => {
    fetchSurveys();
    fetchClients();
  }, []);

  async function fetchSurveys() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('id, title, created_at, status, client_id')
      .order('created_at', { ascending: false });

    if (error) console.error('Error loading surveys:', error);
    else setSurveys(data);
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from('Clients')
      .select('id, first_name, last_name');

    if (error) console.error('Error loading clients:', error);
    else setClients(data);
  }

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
  };

  const filteredSurveys = surveys.filter(s => {
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchClient = clientFilter === 'All' || s.client_id === clientFilter;
    return matchStatus && matchClient;
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">📋 Survey Dashboard</h1>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm h-9"
        >
          <option value="All">All</option>
          <option value="Live">Live</option>
          <option value="Paused">Paused</option>
          <option value="Draft">Draft</option>
        </select>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm h-9"
        >
          <option value="All">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>

        <button
          onClick={() => router.push('/dashboard/surveys/create')}
          className="ml-auto bg-blue-600 text-white px-4 py-1.5 rounded text-sm h-9 whitespace-nowrap"
        >
          + Create Survey
        </button>
      </div>

      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2">Survey Title</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date Created</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {filteredSurveys.map(survey => (
            <tr key={survey.id} className="border-t">
              <td className="px-4 py-2 font-medium text-blue-700">
                <Link href={`/dashboard/surveys/${survey.id}/general`}>{survey.title}</Link>
              </td>
              <td className="px-4 py-2">{getClientName(survey.client_id)}</td>
              <td className="px-4 py-2">{survey.status}</td>
              <td className="px-4 py-2">{new Date(survey.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                <Link href={`/dashboard/surveys/${survey.id}/general`}>
                  <span className="text-blue-500 hover:underline cursor-pointer">Edit</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
