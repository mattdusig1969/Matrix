import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

// Helper function to generate modules
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

export default function SurveyModulesPage() {
  const router = useRouter();
    const { id, tab = 'preview' } = router.query;
  const [survey, setSurvey] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

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
      const { data: surveyData, error } = await supabase.from('Surveys').select('id, title').eq('id', id).single();
      if (error) { setLoading(false); return; }
      setSurvey(surveyData);
      
      await fetchModules();
      
      const { count: simCount } = await supabase.from('simulation_results').select('*', { count: 'exact', head: true }).eq('survey_id', id);
      const { data: surveyModulesData } = await supabase.from('Modules').select('id').eq('survey_id', id);
      let moduleResponseCount = 0;
      if (surveyModulesData && surveyModulesData.length > 0) {
        const moduleIds = surveyModulesData.map(m => m.id);
        const { count } = await supabase.from('ModuleResponses').select('*', { count: 'exact', head: true }).in('module_id', moduleIds);
        moduleResponseCount = count;
      }
      if ((simCount || 0) > 0 || (moduleResponseCount || 0) > 0) setIsLocked(true);
      setLoading(false);
    }
    fetchAllData();
  }, [id]);

  const handleRegenerateModules = async () => {
    if (isLocked) return toast.error("Cannot regenerate modules for a locked survey.");
    const success = await generateAndSaveModules(id);
    if (success) await fetchModules();
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-10">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">📝 Edit Survey: <span className="text-black">{survey?.title}</span></h1>
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
      
      <div className="bg-white shadow p-6 rounded-md">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Generated Modules</h2>
              <button onClick={handleRegenerateModules} disabled={isLocked} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
                  🔄 Regenerate Modules
              </button>
          </div>
          {isLocked && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert"><p className="font-bold">Survey Locked</p><p>Module regeneration is disabled because this survey has response data.</p></div>}
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
    </div>
  );
}