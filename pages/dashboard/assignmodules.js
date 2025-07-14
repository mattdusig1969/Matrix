// pages/dashboard/assignmodules.js
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function AssignModulesPage() {
  const [surveys, setSurveys] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [assignedModule, setAssignedModule] = useState(null);
  const [userId, setUserId] = useState('');
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurveyId) fetchModules(selectedSurveyId);
  }, [selectedSurveyId]);

  async function fetchSurveys() {
    const { data, error } = await supabase.from('Surveys').select('id, title');
    if (error) toast.error('Failed to load surveys');
    else setSurveys(data);
  }

  async function fetchModules(surveyId) {
    const { data, error } = await supabase
      .from('Modules')
      .select('*')
      .eq('survey_id', surveyId);
    if (error) toast.error('Failed to load modules');
    else setModules(data);
  }

  async function handleAssignModule() {
    if (!selectedSurveyId || !age || !gender) {
      toast.error('Please select all fields');
      return;
    }

    if (modules.length === 0) {
      toast.error('No modules available for this survey');
      return;
    }

    const randomModule = modules[Math.floor(Math.random() * modules.length)];

    const payload = {
      survey_id: selectedSurveyId,
      module_id: randomModule.id,
      gender: gender,
      age: age,
    };

    console.log('📦 Payload being sent to Supabase:', payload);

    const { error } = await supabase.from('ModuleAssignments').insert([payload]);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      toast.error(`Error assigning module: ${error.message || 'Unknown error'}`);
    } else {
      setAssignedModule(randomModule);
      toast.success('Module assigned!');

      // Fetch question_text from questions table where module_id matches
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('question_text')
        .eq('module_id', randomModule.id);

      if (qError) {
        console.error('Error loading questions:', qError);
        setQuestions([]);
      } else {
        setQuestions(qData.map((q) => q.question_text));
      }
    }
  }

  return (
    <div className="container py-8 max-w-xl mx-auto">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">🎯 Assign Module to User</h1>

      <div className="bg-white shadow rounded p-6 space-y-4">
        <label>Select a Survey</label>
        <select
          className="w-full border px-3 py-2 rounded"
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
        >
          <option value="">— Choose Survey —</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>

        <label>User Gender</label>
        <select
          className="w-full border px-3 py-2 rounded"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">— Choose Gender —</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <label>User Age Range</label>
        <select
          className="w-full border px-3 py-2 rounded"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        >
          <option value="">— Choose Age —</option>
          {['18-24', '25-34', '35-44', '45-54', '55+'].map((range) => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>

        <label>User ID (optional)</label>
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Enter user ID (optional)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleAssignModule}
        >
          🎲 Assign Module
        </button>
      </div>

      {assignedModule && (
        <div className="bg-green-100 border border-green-400 p-4 mt-6 rounded">
          <h2 className="text-lg font-bold">✅ Module Assigned</h2>
          <p className="mt-2">Module #{assignedModule.module_number}</p>

          {questions.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Questions:</h3>
              <ul className="list-disc list-inside space-y-1">
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
