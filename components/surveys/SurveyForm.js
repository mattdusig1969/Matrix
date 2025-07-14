import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function SurveyForm({ mode = 'create', initialData = {}, onSubmit }) {
  const [status, setStatus] = useState(initialData.status || 'Live');
  const [clientId, setClientId] = useState(initialData.client_id || '');
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [targetN, setTargetN] = useState(initialData.target_n || '');
  const [questions, setQuestions] = useState(initialData.questions || '');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase.from('Clients').select('id, first_name, last_name');
      if (!error) setClients(data);
    }
    fetchClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formValues = {
      status,
      client_id: clientId,
      title,
      description,
      target_n: targetN,
      questions,
    };
    onSubmit(formValues);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium mb-1">Survey Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded w-full px-3 py-2">
          {['Live', 'Paused', 'Draft'].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-medium mb-1">Select a Client</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="border rounded w-full px-3 py-2">
          <option value="">Select...</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-medium mb-1">Survey Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded w-full px-3 py-2" />
      </div>

      <div>
        <label className="block font-medium mb-1">Survey Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border rounded w-full px-3 py-2" />
      </div>

      <div>
        <label className="block font-medium mb-1">Target N (completes needed)</label>
        <input type="number" value={targetN} onChange={(e) => setTargetN(e.target.value)} className="border rounded w-full px-3 py-2" />
      </div>

      <div>
        <label className="block font-medium mb-1">Questions (Q/A format)</label>
        <textarea
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          className="border rounded w-full px-3 py-2 h-40"
        />
      </div>

      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
        {mode === 'edit' ? 'Update Survey' : 'Create Survey'}
      </button>
    </form>
  );
}
