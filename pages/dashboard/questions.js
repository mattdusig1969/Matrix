import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

const questionTypes = [
  { value: 'single_select_radio', label: 'Single Select (Radio)' },
  { value: 'single_select_dropdown', label: 'Single Select (Dropdown)' },
  { value: 'multiple_select', label: 'Multiple Select (Checkbox)' },
  { value: 'user_input', label: 'User Input (Open Text)' },
  { value: 'rating_scale', label: 'Rating Scale (e.g., 1-5)' },
  { value: 'likert_scale', label: 'Likert Scale' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'matrix', label: 'Matrix Table' },
];

const typesWithPredefinedOptions = ['single_select_radio', 'single_select_dropdown', 'multiple_select', 'ranking', 'likert_scale'];
const isMatrix = (type) => type === 'matrix';
const isScale = (type) => type === 'rating_scale';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [editingId, setEditingId] = useState(null);

  const defaultFormState = {
    question_text: '',
    question_type: 'single_select_radio',
    answer_option: [''],
  };
  const [form, setForm] = useState(defaultFormState);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurveyId) {
      fetchQuestions(selectedSurveyId);
    } else {
      setQuestions([]);
    }
  }, [selectedSurveyId]);

  async function fetchSurveys() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('id, title')
      .eq('status', 'Live')
      .order('title');

    if (error) toast.error('Failed to load surveys');
    else setSurveys(data);
  }

  // FIXED: Re-added the missing fetchQuestions function.
  async function fetchQuestions(surveyId) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, answer_option, survey_id, question_type')
      .eq('survey_id', surveyId)
      .order('created_at');
    if (error) toast.error('Error fetching questions');
    else setQuestions(data || []);
  }
  
  // REMOVED: Duplicate fetchSurveys function was here.

  function handleFormChange(field, value) {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      // Handle special logic for different question types...
      if (field === 'question_type') {
        if (typesWithPredefinedOptions.includes(value)) {
            newForm.answer_option = [''];
        } else if (isMatrix(value)) {
            newForm.answer_option = { rows: [''], columns: [''] };
        } else if (isScale(value)) {
            newForm.answer_option = { min: 1, max: 5, minLabel: '', maxLabel: '' };
        } else {
            newForm.answer_option = [];
        }
      }
      return newForm;
    });
  }
  
  function handleOptionChange(index, value) {
    const updated = [...form.answer_option];
    updated[index] = value;
    setForm({ ...form, answer_option: updated });
  }

  function addOption() {
    setForm({ ...form, answer_option: [...(form.answer_option || []), ''] });
  }

  function removeOption(index) {
    const updated = form.answer_option.filter((_, i) => i !== index);
    setForm({ ...form, answer_option: updated });
  }
  
  // --- Matrix/Scale Specific Handlers ---
  function handleMatrixOptionChange(type, index, value) {
    const newOptions = { ...form.answer_option };
    newOptions[type][index] = value;
    setForm({ ...form, answer_option: newOptions });
  }

  function addMatrixOption(type) {
    const newOptions = { ...form.answer_option };
    newOptions[type].push('');
    setForm({ ...form, answer_option: newOptions });
  }

  function removeMatrixOption(type, index) {
    const newOptions = { ...form.answer_option };
    newOptions[type] = newOptions[type].filter((_, i) => i !== index);
    setForm({ ...form, answer_option: newOptions });
  }


  function loadForEdit(q) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({
      question_text: q.question_text,
      question_type: q.question_type || 'single_select_radio',
      answer_option: q.answer_option || (typesWithPredefinedOptions.includes(q.question_type) ? [''] : []),
    });
    setEditingId(q.id);
  }

  async function handleSubmit() {
    if (!selectedSurveyId || !form.question_text.trim()) {
      return toast.error('Survey and question text are required.');
    }
    
    let payload_answer_option = form.answer_option;
    if (typesWithPredefinedOptions.includes(form.question_type)) {
      payload_answer_option = Array.isArray(form.answer_option) ? form.answer_option.filter(a => a && a.trim() !== '') : [];
      if (payload_answer_option.length === 0) {
        return toast.error('At least one answer option is required for this question type.');
      }
    }

    const payload = {
      survey_id: selectedSurveyId,
      question_text: form.question_text.trim(),
      question_type: form.question_type,
      answer_option: payload_answer_option,
    };

    const { error } = editingId
      ? await supabase.from('questions').update(payload).eq('id', editingId)
      : await supabase.from('questions').insert([payload]);

    if (error) {
      return toast.error('Error saving question.');
    }
    
    toast.success(`Question ${editingId ? 'updated' : 'saved'}!`);
    resetForm();
    fetchQuestions(selectedSurveyId);
  }

  function resetForm() {
    setForm(defaultFormState);
    setEditingId(null);
  }

  const renderAnswerOptions = () => {
    const { question_type, answer_option } = form;
    if (typesWithPredefinedOptions.includes(question_type)) {
      return (
        <div>
          <label className="font-medium">Answer Options</label>
          {(answer_option || ['']).map((answer, index) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <input className="w-full border px-3 py-2 rounded-md" value={answer} onChange={(e) => handleOptionChange(index, e.target.value)} />
              {(answer_option.length > 1) && <button onClick={() => removeOption(index)} className="bg-red-500 text-white px-3 py-1 rounded-md">✕</button>}
            </div>
          ))}
          <button onClick={addOption} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm">➕ Add Answer</button>
        </div>
      );
    }
    if (isScale(question_type)) {
        return (
            <div>
                <label className="font-medium">Scale Configuration</label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                    <input type="number" className="border px-3 py-2 rounded-md" placeholder="Min Value (e.g., 1)" value={answer_option.min || ''} onChange={(e) => setForm({...form, answer_option: {...answer_option, min: e.target.value}})} />
                    <input type="number" className="border px-3 py-2 rounded-md" placeholder="Max Value (e.g., 5)" value={answer_option.max || ''} onChange={(e) => setForm({...form, answer_option: {...answer_option, max: e.target.value}})} />
                    <input className="border px-3 py-2 rounded-md" placeholder="Min Label (e.g., Not Likely)" value={answer_option.minLabel || ''} onChange={(e) => setForm({...form, answer_option: {...answer_option, minLabel: e.target.value}})} />
                    <input className="border px-3 py-2 rounded-md" placeholder="Max Label (e.g., Very Likely)" value={answer_option.maxLabel || ''} onChange={(e) => setForm({...form, answer_option: {...answer_option, maxLabel: e.target.value}})} />
                </div>
            </div>
        );
    }
    if (isMatrix(question_type)) {
      return (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="font-medium">Rows (Statements)</label>
            {(answer_option.rows || ['']).map((row, i) => (
              <div key={i} className="flex items-center gap-2 mt-1">
                <input className="w-full border px-3 py-2 rounded-md" value={row} onChange={(e) => handleMatrixOptionChange('rows', i, e.target.value)} />
                {(answer_option.rows.length > 1) && <button onClick={() => removeMatrixOption('rows', i)} className="bg-red-500 text-white px-2 py-1 rounded">✕</button>}
              </div>
            ))}
            <button onClick={() => addMatrixOption('rows')} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm">➕ Add Row</button>
          </div>
          <div>
            <label className="font-medium">Columns (Scale)</label>
            {(answer_option.columns || ['']).map((col, i) => (
              <div key={i} className="flex items-center gap-2 mt-1">
                <input className="w-full border px-3 py-2 rounded-md" value={col} onChange={(e) => handleMatrixOptionChange('columns', i, e.target.value)} />
                {(answer_option.columns.length > 1) && <button onClick={() => removeMatrixOption('columns', i)} className="bg-red-500 text-white px-2 py-1 rounded">✕</button>}
              </div>
            ))}
            <button onClick={() => addMatrixOption('columns')} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm">➕ Add Column</button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-6">{editingId ? '✏️ Edit' : '✨ Add'} Question</h1>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium">Assign to Survey</label>
              <select className="w-full mt-1 border px-3 py-2 rounded-md" value={selectedSurveyId} onChange={(e) => setSelectedSurveyId(e.target.value)}><option value="">— Choose Survey —</option>{surveys.map((s) => (<option key={s.id} value={s.id}>{s.title}</option>))}</select>
            </div>
            <div>
              <label className="font-medium">Question Type</label>
              <select className="w-full mt-1 border px-3 py-2 rounded-md" value={form.question_type} onChange={(e) => handleFormChange('question_type', e.target.value)}>{questionTypes.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}</select>
            </div>
        </div>
        <div>
          <label className="font-medium">Question Text</label>
          <input className="w-full mt-1 border px-3 py-2 rounded-md" placeholder="e.g. How often do you brush your teeth?" value={form.question_text} onChange={(e) => handleFormChange('question_text', e.target.value)} />
        </div>
        {renderAnswerOptions()}
        <div className="pt-4 flex items-center gap-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-5 py-2 rounded-md font-semibold">{editingId ? '💾 Update' : '➕ Save'}</button>
            {editingId && (<button onClick={resetForm} className="text-sm text-gray-600 hover:underline">Cancel Edit</button>)}
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-4">📋 Questions for Selected Survey</h2>
      {selectedSurveyId && questions.length === 0 && <p className="text-gray-500 italic">No questions found for this survey.</p>}
      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-start">
            <div>
              <strong className="text-gray-800">{q.question_text}</strong>
              <span className="ml-3 bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">{questionTypes.find(t => t.value === q.question_type)?.label || q.question_type}</span>
              {Array.isArray(q.answer_option) && typesWithPredefinedOptions.includes(q.question_type) && (
                <ul className="text-sm text-gray-600 mt-2 list-disc ml-5 space-y-1">{(q.answer_option || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
              )}
              {typeof q.answer_option === 'object' && !Array.isArray(q.answer_option) && q.answer_option !== null && (
                 <div className="text-sm text-gray-600 mt-2">
                    {q.answer_option.rows && <div><strong>Rows:</strong> {q.answer_option.rows.join(', ')}</div>}
                    {q.answer_option.columns && <div><strong>Cols:</strong> {q.answer_option.columns.join(', ')}</div>}
                    {q.answer_option.min && <div><strong>Scale:</strong> {q.answer_option.min} to {q.answer_option.max}</div>}
                 </div>
              )}
            </div>
            <button onClick={() => loadForEdit(q)} className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-md font-medium text-sm hover:bg-blue-200 whitespace-nowrap">Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}