import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [form, setForm] = useState({ question_text: '', answer_option: [''] });
  const [editingId, setEditingId] = useState(null);

  // Load surveys on mount
  useEffect(() => {
    fetchSurveys();
  }, []);

  // Load questions when a survey is selected
  useEffect(() => {
    if (selectedSurveyId) {
      fetchQuestions(selectedSurveyId);
    } else {
      setQuestions([]);
    }
  }, [selectedSurveyId]);

  // Debugging
  useEffect(() => {
    console.log("✅ Debug Check: Survey ID:", selectedSurveyId);
    questions.forEach((q, i) => console.log(`Q${i + 1} ➝ survey_id:`, q.survey_id));
  }, [questions]);

  async function fetchSurveys() {
    const { data, error } = await supabase.from('Surveys').select('id, title');
    if (error) {
      console.error('❌ Failed to load surveys:', error);
      toast.error('Failed to load surveys');
    } else {
      setSurveys(data);
    }
  }

  async function fetchQuestions(surveyId) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, answer_option, survey_id')
      .eq('survey_id', surveyId.trim());

    if (error) {
      console.error('❌ Failed to fetch questions:', error);
      toast.error('Error fetching questions');
    } else {
      setQuestions(data);
    }
  }

  function handleAnswerChange(index, value) {
    const updated = [...form.answer_option];
    updated[index] = value;
    setForm({ ...form, answer_option: updated });
  }

  function addAnswerField() {
    setForm({ ...form, answer_option: [...form.answer_option, ''] });
  }

  function removeAnswerField(index) {
    const updated = form.answer_option.filter((_, i) => i !== index);
    setForm({ ...form, answer_option: updated });
  }

  function loadForEdit(q) {
    setForm({
      question_text: q.question_text,
      answer_option: q.answer_option || [''],
    });
    setEditingId(q.id);
  }

  async function handleSubmit() {
    if (!selectedSurveyId) return toast.error('Please select a survey');
    if (!form.question_text.trim()) return toast.error('Question text is required');

    const payload = {
      survey_id: selectedSurveyId,
      question_text: form.question_text.trim(),
      answer_option: form.answer_option.filter((a) => a.trim() !== ''),
    };

    if (payload.answer_option.length === 0) {
      return toast.error('At least one answer is required');
    }

    const result = editingId
      ? await supabase.from('questions').update(payload).eq('id', editingId)
      : await supabase.from('questions').insert([payload]);

    if (result.error) {
      console.error('❌ Error saving question:', result.error);
      return toast.error('Error saving question');
    }

    toast.success(editingId ? 'Question updated' : 'Question saved');
    resetForm();
    fetchQuestions(selectedSurveyId);
  }

  function resetForm() {
    setForm({ question_text: '', answer_option: [''] });
    setEditingId(null);
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">
        ❓ {editingId ? 'Edit Question' : 'Add New Question'}
      </h1>

      <div className="bg-white shadow rounded p-6 space-y-4">
        <label>Assign to Survey</label>
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

        <label>Question Text</label>
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="e.g. How often do you brush your teeth?"
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
        />

        <label>Answer Options</label>
        {form.answer_option.map((answer, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              className="w-full border px-3 py-2 rounded"
              placeholder={`Answer ${index + 1}`}
              value={answer}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
            />
            {form.answer_option.length > 1 && (
              <button
                onClick={() => removeAnswerField(index)}
                className="bg-red-600 text-white px-2 py-1 rounded"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addAnswerField}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          ➕ Add Another Answer
        </button>

        <button
          onClick={handleSubmit}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editingId ? '💾 Update Question' : '➕ Save Question'}
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-3">
        📋 All Questions for Selected Survey
      </h2>

      {selectedSurveyId && questions.length === 0 && (
        <p className="text-gray-500 italic">No questions found for this survey.</p>
      )}

      <ul className="space-y-3">
        {questions.map((q) => (
          <li
            key={q.id}
            className="bg-white p-4 rounded shadow flex justify-between items-start"
          >
            <div>
              <strong>{q.question_text}</strong>
              <ul className="text-sm text-gray-600 mt-1 list-disc ml-5">
                {(q.answer_option || []).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => loadForEdit(q)}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
