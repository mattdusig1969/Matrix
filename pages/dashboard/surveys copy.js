import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://fpytddctddiqubxjsfaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZweXRkZGN0ZGRpcXVieGpzZmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTkxNDIsImV4cCI6MjA2NjUzNTE0Mn0.veKMuGsRqkEX2Oid2ly9MFMILtrwbtHGegsKWyTPwrI'
);

export default function SurveysPage() {
  const [surveys, setSurveys] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    description: '',
    questions: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchClients();
    fetchSurveys();
  }, []);

  async function fetchClients() {
    const { data, error } = await supabase.from('Clients').select('id, first_name, last_name');
    if (error) {
      toast.error('Failed to load clients');
    } else {
      setClients(data);
    }
  }

  async function fetchSurveys() {
    const { data, error } = await supabase.from('Surveys').select('*');
    if (error) {
      toast.error('Failed to load surveys');
    } else {
      setSurveys(data);
    }
  }

  function getClientName(clientId) {
    const client = clients.find((c) => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  }

  function loadForEdit(survey) {
    setForm({
      client_id: survey.client_id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
    });
    setEditingId(survey.id);
  }

  async function handleSubmit() {
    if (!form.client_id || !form.title) {
      toast.error('Client and title are required');
      return;
    }

    if (editingId) {
      const { error } = await supabase.from('Surveys').update(form).eq('id', editingId);
      if (error) {
        toast.error('Error updating survey');
      } else {
        toast.success('Survey updated!');
        resetForm();
        fetchSurveys();
      }
      return;
    }

    const { data, error } = await supabase.from('Surveys').insert([form]).select();
    if (error || !data || !data.length) {
      toast.error('Error creating survey');
      return;
    }

    const newSurvey = data[0];
    toast.success('Survey created!');

    const parsedQuestions = parseQuestions(form.questions);
    const questionsToInsert = parsedQuestions.map((q) => ({
      survey_id: newSurvey.id,
      question_text: q.question,
      answer_option: q.answers, // JSON array
    }));

    console.log('Parsed Questions:', questionsToInsert);

    const { error: qError } = await supabase.from('Questions').insert(questionsToInsert);
    if (qError) {
      console.error('❌ Insert Questions Error:', qError);
      console.log('🧪 Payload Sent to Supabase:', questionsToInsert);
      toast.error('Survey saved, but error adding questions.');
    }

    resetForm();
    fetchSurveys();
  }

  function parseQuestions(raw) {
    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    const questions = [];
    let currentQuestion = null;

    lines.forEach(line => {
      if (line.startsWith('Q')) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          question: line.replace(/^Q\d*:\s*/, ''), // strip "Q1: "
          answers: [],
        };
      } else if (line.startsWith('A:') && currentQuestion) {
        currentQuestion.answers.push(line.replace(/^A:\s*/, '')); // strip "A: "
      }
    });

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return questions;
  }


  function resetForm() {
    setForm({ client_id: '', title: '', description: '', questions: '' });
    setEditingId(null);
  }

  return (
    <div className="container py-8">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">📋 {editingId ? 'Edit Survey' : 'Create Survey'}</h1>

      <div className="bg-white shadow rounded p-6 mb-8 space-y-4">
        <label>Select a Client</label>
        <select
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
        >
          <option value="">— Choose Client —</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>

        <label>Survey Title</label>
        <input
          placeholder="e.g. Customer Satisfaction Survey"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <label>Survey Description</label>
        <textarea
          placeholder="Brief description..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label>Questions (format: Q / A lines)</label>
        <textarea
          className="h-48 w-full"
          placeholder="Q1: How are you?\nA: Good\nA: Okay\nA: Bad"
          value={form.questions}
          onChange={(e) => setForm({ ...form, questions: e.target.value })}
        />

        <button onClick={handleSubmit}>
          {editingId ? '💾 Update Survey' : '➕ Create Survey'}
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-3">📊 Existing Surveys</h2>
      <ul className="space-y-3">
        {surveys.map((survey) => (
          <li key={survey.id} className="bg-white p-4 rounded shadow flex justify-between items-start">
            <div>
              <strong>{survey.title}</strong> — {getClientName(survey.client_id)}
              <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
            </div>
            <button
              onClick={() => loadForEdit(survey)}
              className="text-blue-600 hover:underline"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
