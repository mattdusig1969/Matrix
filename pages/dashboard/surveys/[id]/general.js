import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SurveyForm from '../../../../components/surveys/SurveyForm';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
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

// This helper function encapsulates the logic from modules.js
async function generateAndSaveModules(surveyId) {
  const toastId = toast.loading("Generating modules...");
  try {
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, question_text, question_number")
      .eq("survey_id", surveyId);
    if (qError || !questions || questions.length === 0) {
      throw new Error("No questions found for this survey.");
    }

    const response = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyId, questions }),
    });
    if (!response.ok) throw new Error("API call to generate modules failed.");
    const data = await response.json();
    const generatedModules = data.modules || [];
    
    await supabase.from("Modules").delete().eq("survey_id", surveyId);

    for (let i = 0; i < generatedModules.length; i++) {
      const mod = generatedModules[i];
      const { data: insertedModule } = await supabase
        .from("Modules")
        .insert({ survey_id: surveyId, module_number: i + 1 })
        .select()
        .single();
      if (!insertedModule) continue;
      const questionNumbersInModule = mod.questions.map(qCode => qCode.replace("Q", "").trim());
      const questionIdsToUpdate = questions
        .filter(q => questionNumbersInModule.includes(String(q.question_number)))
        .map(q => q.id);
      if (questionIdsToUpdate.length > 0) {
        await supabase
          .from("questions")
          .update({ module_id: insertedModule.id })
          .in("id", questionIdsToUpdate);
      }
    }
    toast.success("Modules generated successfully!", { id: toastId });
    return true;
  } catch (error) {
    toast.error(`Module generation failed: ${error.message}`, { id: toastId });
    console.error(error);
    return false;
  }
}

const QuestionTypeLegend = () => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 sticky top-10">
      <h3 className="font-bold text-md mb-2">💡 Question Type Legend</h3>
      <p className="text-sm text-slate-600 mb-3">
        Use this legend as a reference when adding or editing questions.
      </p>
      <ul className="space-y-1">
        {questionTypes.map(type => (
            <li key={type.value} className="text-xs">
                <strong className="text-slate-800">{type.label}:</strong>
                <code className="ml-1 bg-slate-200 text-slate-700 px-1 py-0.5 rounded">{type.value}</code>
            </li>
        ))}
      </ul>
    </div>
);

const InlineEditForm = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState(question);

  const handleSave = () => {
    if (!formData.question_text.trim()) {
        return toast.error("Question text cannot be empty.");
    }
    onSave(formData);
  };
  
  const renderOptions = () => {
    if (!Array.isArray(formData.answer_option)) return null;
    return (
        <div className="space-y-2 mt-2">
            <label className="text-sm font-medium text-gray-600">Answer Options</label>
            {formData.answer_option.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input value={opt} onChange={(e) => { const newOptions = [...formData.answer_option]; newOptions[index] = e.target.value; setFormData({...formData, answer_option: newOptions}); }} className="w-full border px-2 py-1 rounded-md text-sm"/>
                    <button onClick={() => { const newOptions = formData.answer_option.filter((_, i) => i !== index); setFormData({...formData, answer_option: newOptions}); }} className="bg-red-500 text-white rounded px-2 py-1 text-xs">✕</button>
                </div>
            ))}
            <button onClick={() => setFormData({...formData, answer_option: [...formData.answer_option, '']})} className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm mt-1">+ Add Answer</button>
        </div>
    );
  };
  
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <label className="text-sm font-medium text-gray-600">Question Text</label>
        <textarea value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} className="w-full border px-3 py-2 rounded-md shadow-sm" rows={2}/>
        <label className="text-sm font-medium text-gray-600 mt-2 block">Question Type</label>
        <select value={formData.question_type} onChange={(e) => setFormData({ ...formData, question_type: e.target.value, answer_option: [] })} className="w-full mt-1 border px-3 py-2 rounded-md shadow-sm text-sm">
            {questionTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
        {renderOptions()}
        <div className="flex items-center gap-4 mt-4">
            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1.5 rounded-md font-semibold text-sm">Save</button>
            <button onClick={onCancel} className="text-sm text-gray-600 hover:underline">Cancel</button>
        </div>
    </div>
  );
};


export default function EditSurveyPage() {
  const router = useRouter();
  const { id, tab = 'general' } = router.query;
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [modules, setModules] = useState([]);

  async function fetchQuestions() {
    if (!id) return;
    const { data, error } = await supabase.from('questions').select('*').eq('survey_id', id).order('question_order');
    if (error) toast.error("Failed to load questions.");
    else setQuestions(data || []);
  }

  async function fetchModules() {
    if (!id) return;
    const { data, error } = await supabase
      .from('Modules')
      .select(`*, questions(*)`)
      .eq('survey_id', id)
      .order('module_number');
    
    if (error) toast.error("Failed to load modules.");
    else setModules(data || []);
  }

  useEffect(() => {
    if (!id) return;
    async function fetchAllData() {
      const { data, error } = await supabase.from('Surveys').select('*').eq('id', id).single();
      if (error) { setLoading(false); return; }
      setInitialData(data);
      
      await Promise.all([
          fetchQuestions(),
          fetchModules()
      ]);
      
      const { count: simCount } = await supabase.from('simulation_results').select('*', { count: 'exact', head: true }).eq('survey_id', id);
      const { data: surveyModules } = await supabase.from('Modules').select('id').eq('survey_id', id);
      let moduleResponseCount = 0;
      if (surveyModules && surveyModules.length > 0) {
        const moduleIds = surveyModules.map(m => m.id);
        const { count } = await supabase.from('ModuleResponses').select('*', { count: 'exact', head: true }).in('module_id', moduleIds);
        moduleResponseCount = count;
      }
      if ((simCount || 0) > 0 || (moduleResponseCount || 0) > 0) setIsLocked(true);
      setLoading(false);
    }
    fetchAllData();
  }, [id]);

  const handleUpdate = async (values) => {
    if (isLocked) return toast.error("This survey has existing data and cannot be modified.");
    delete values.questions;
    const { error } = await supabase.from('Surveys').update(values).eq('id', id);
    if (error) toast.error('Update failed: ' + error.message);
    else toast.success('Survey details updated!');
  };
  
  const handleSaveQuestion = async (formData) => {
    const isNew = !formData.id;
    const payload = {
        survey_id: id,
        question_text: formData.question_text,
        question_type: formData.question_type,
        answer_option: formData.answer_option,
        question_order: formData.question_order ?? questions.length
    };
    const { error } = isNew
        ? await supabase.from('questions').insert({ ...payload, id: undefined })
        : await supabase.from('questions').update(payload).eq('id', formData.id);

    if (error) {
        toast.error(`Failed to ${isNew ? 'add' : 'save'} question.`);
        console.error(error);
    } else {
        toast.success(`Question ${isNew ? 'added' : 'saved'}!`);
        setEditingQuestionId(null);
        await fetchQuestions(); // Refresh questions after saving
    }
  };
  
  const handleAddNewQuestion = () => setEditingQuestionId('new');

  const handleRegenerateModules = async () => {
    if (isLocked) return toast.error("Cannot regenerate modules for a locked survey.");
    const success = await generateAndSaveModules(id);
    if (success) await fetchModules();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-10">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">📝 Edit Survey: <span className="text-black">{initialData?.title}</span></h1>
      <div className="flex space-x-4 border-b">
  <Link href={`/dashboard/surveys/${id}/general`} className={`px-4 py-2 rounded-t-lg ${tab === 'general' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>
    General
  </Link>
  <Link href={`/dashboard/surveys/${id}/targeting`} className={`px-4 py-2 rounded-t-lg ${tab === 'targeting' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>
    Targeting
  </Link>
  <Link href={`/dashboard/surveys/${id}/modules`} className={`px-4 py-2 rounded-t-lg ${tab === 'modules' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>
    Modules
  </Link>
          <Link href={`/dashboard/surveys/${id}/adcode`} className={`px-4 py-2 rounded-t-lg ${tab === 'adcode' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Ad Code</Link>

  <Link href={`/dashboard/surveys/${id}/preview`} className={`px-4 py-2 rounded-t-lg ${tab === 'preview' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>
    Preview
  </Link>
  <Link href={`/dashboard/surveys/${id}/quotas`} className={`px-4 py-2 rounded-t-lg ${tab === 'quotas' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>
    Quotas
  </Link>
  <Link href={`/dashboard/surveys/${id}/reporting`} className={`px-4 py-2 rounded-t-lg ${tab === 'reporting' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>
    Reporting
  </Link>
</div>
      {isLocked && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert"><p className="font-bold">Survey Locked</p><p>This survey cannot be edited because it has response data.</p></div>}
      
      {tab === 'general' && (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-grow space-y-8 w-full md:w-2/3">
                <fieldset disabled={isLocked} className={`bg-white shadow p-6 rounded-md ${isLocked ? 'opacity-60' : ''}`}>
                    <SurveyForm mode="edit" initialData={initialData} onSubmit={handleUpdate} />
                </fieldset>
                <fieldset disabled={isLocked} className={`bg-white shadow p-6 rounded-md ${isLocked ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Survey Questions</h2>
                        <button onClick={handleAddNewQuestion} disabled={isLocked} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold">+ Add New Question</button>
                    </div>
                    <div className="space-y-4">
                        {editingQuestionId === 'new' && (
                            <InlineEditForm question={{ question_text: '', question_type: 'single_select_radio', answer_option: [''] }} onSave={handleSaveQuestion} onCancel={() => setEditingQuestionId(null)} />
                        )}
                        {questions.map(q => (
                            <div key={q.id}>
                                {editingQuestionId === q.id ? (
                                    <InlineEditForm question={q} onSave={handleSaveQuestion} onCancel={() => setEditingQuestionId(null)} />
                                ) : (
                                    <div className="flex justify-between items-center p-3 border rounded-lg">
                                        <div><p className="font-semibold">{q.question_text}</p><p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">{q.question_type}</p></div>
                                        <button onClick={() => setEditingQuestionId(q.id)} disabled={isLocked} className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-md font-medium text-sm">Edit</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </fieldset>
            </div>
            <div className="w-full md:w-1/3">
                <QuestionTypeLegend />
            </div>
          </div>
      )}

      {tab === 'modules' && (
        <div className="bg-white shadow p-6 rounded-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Generated Modules</h2>
                <button onClick={handleRegenerateModules} disabled={isLocked} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold">
                    🔄 Regenerate Modules
                </button>
            </div>
            {modules.length > 0 ? (
                <div className="space-y-6">
                    {modules.map(mod => (
                        <div key={mod.id} className="p-4 border rounded-lg">
                            <h3 className="font-bold mb-2">Module {mod.module_number}</h3>
                            <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                                {mod.questions.sort((a,b) => a.question_order - b.question_order).map(q => (
                                    <li key={q.id}>{q.question_text}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic">No modules have been generated for this survey yet.</p>
            )}
        </div>
      )}
    </div>
  );
}