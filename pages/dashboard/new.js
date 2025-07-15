import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function NewSurveyPage() {
  const router = useRouter();

  const [clients, setClients] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    description: '',
    questions: '',
    status: 'Live',
    target_n: 0,
    target_age_ranges: [],
    target_genders: []
  });

  const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45+'];
  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const STATUS_OPTIONS = ['All', 'Live', 'Paused', 'Closed', 'Completed'];

  const filteredSurveys = surveys.filter(survey =>
    statusFilter === 'All' || survey.status === statusFilter
  );

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase.from('Clients').select('id, first_name, last_name');
      if (error) toast.error('Failed to load clients');
      else setClients(data);
    }

    fetchClients();
  }, []);

  function handleCheckboxChange(field, value) {
    setForm(prev => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  }

  function parseQuestions(raw) {
    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    const questions = [];
    let current = null;

    for (const line of lines) {
      if (line.match(/^Q\\d*:/)) {
        if (current) questions.push(current);
        current = { question: line.replace(/^Q\\d*:\\s*/, ''), answers: [] };
      } else if (line.startsWith('A:') && current) {
        current.answers.push(line.replace(/^A:\\s*/, ''));
      }
    }

    if (current) questions.push(current);
    return questions;
  }

  async function handleSubmit() {
    if (!form.client_id || !form.title) {
      toast.error('Client and title are required');
      return;
    }

    const { data, error } = await supabase.from('Surveys').insert([form]).select();
    if (error || !data?.[0]) {
      toast.error('Error creating survey');
      return;
    }

    const newSurvey = data[0];
    const parsed = parseQuestions(form.questions);
    const questionsToInsert = parsed.map((q) => ({
      survey_id: newSurvey.id,
      question_text: q.question,
      answer_option: q.answers.filter(Boolean),
    }));

    const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
    if (qError) toast.error('Survey saved, but error adding questions.');
    else toast.success('Survey created successfully!');

    router.push('/dashboard/surveys');
  }

  return (
  <div className="flex h-screen">
    <Toaster />
    
    {/* Sidebar: Survey List */}
    <div className="w-1/3 border-r overflow-y-auto p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">📋 Surveys</h2>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          + Create Survey
        </button>
      </div>

      <label className="block font-medium mb-2">Filter by Status:</label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="w-full mb-4 border px-2 py-1 rounded"
      >
        {STATUS_OPTIONS.map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <ul className="space-y-3">
        {filteredSurveys.map((survey) => (
          <li key={survey.id} className="bg-white p-4 rounded shadow">
            <div>
              <strong>{survey.title}</strong> — {getClientName(survey.client_id)}
              <div className="text-sm text-gray-500 italic">Status: {survey.status}</div>
              <p className="text-sm text-blue-700">
                🎯 N Target: {survey.target_n || 0} | Age: {survey.target_age_ranges?.join(', ') || '—'} | Gender: {survey.target_genders?.join(', ') || '—'}
              </p>
            </div>
            <div className="flex justify-between mt-2">
              <button onClick={() => loadForEdit(survey)} className="bg-blue-600 text-white px-3 py-1 rounded">
                Edit
              </button>
              <button onClick={() => handleCopySurvey(survey)} className="bg-blue-600 text-white px-3 py-1 rounded">
                Copy
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>

    {/* Main Panel: Create/Edit Form */}
    <div className="w-2/3 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {editingId ? `✏️ Edit Survey: ${form.title}` : '➕ Create Survey'}
      </h1>

      <div className="bg-white shadow rounded p-6 space-y-4">
        {/* Entire form preserved as-is below */}
        {/* Survey Status */}
        <label>Survey Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="Live">Live</option>
          <option value="Paused">Paused</option>
          <option value="Closed">Closed</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Select a Client */}
        <label>Select a Client</label>
        <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
          <option value="">— Choose Client —</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>

        {/* Title + Description */}
        <label>Survey Title</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label>Survey Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        {/* Target N */}
        <label>Target N (completes needed)</label>
        <input
          type="number"
          value={form.target_n}
          onChange={(e) => setForm({ ...form, target_n: parseInt(e.target.value) || 0 })}
        />

        {/* Age & Gender */}
        <label>Target Age Ranges</label>
        <div className="flex gap-4 flex-wrap">
          {AGE_OPTIONS.map(age => (
            <label key={age} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.target_age_ranges.includes(age)}
                onChange={() => handleCheckboxChange('target_age_ranges', age)}
              />
              {age}
            </label>
          ))}
        </div>

        <label>Target Genders</label>
        <div className="flex gap-4 flex-wrap">
          {GENDER_OPTIONS.map(gender => (
            <label key={gender} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.target_genders.includes(gender)}
                onChange={() => handleCheckboxChange('target_genders', gender)}
              />
              {gender}
            </label>
          ))}
        </div>

        {/* QA Format */}
        <label>Questions (Q/A format)</label>
        <textarea
          className="h-48 w-full"
          placeholder="Q1: How are you?\nA: Good\nA: Okay\nA: Bad"
          value={form.questions}
          onChange={(e) => setForm({ ...form, questions: e.target.value })}
        />

        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? '💾 Update Survey' : '➕ Create Survey'}
        </button>
      </div>
    </div>
  </div>
);

}
