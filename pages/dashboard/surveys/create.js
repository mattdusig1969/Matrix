import SurveyForm from '../../../components/surveys/SurveyForm';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

// This helper function encapsulates the logic from modules.js
async function generateAndSaveModules(surveyId, supabase) {
  const toastId = toast.loading("Generating modules...");
  try {
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, question_text, question_number")
      .eq("survey_id", surveyId);
    if (qError || !questions || questions.length === 0) {
      throw new Error("No questions found to generate modules.");
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

const FormattingGuide = () => (
  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
    <h3 className="font-bold text-md mb-2">📋 Formatting Guide</h3>
    <p className="text-sm text-slate-600 mb-3">
      Use the following format in the "Questions" text area. Each question must start with `Q:`, followed by an optional `Type:`, and any answers must start with `A:`.
    </p>
    <pre className="bg-slate-200 text-slate-800 p-3 rounded-md text-xs whitespace-pre-wrap">
      {`Q: How often do you exercise?\nType: single_select_radio\nA: Daily\nA: Weekly\n\nQ: What are your hobbies?\nType: multiple_select\nA: Reading\nA: Sports\n\nQ: Any feedback for us?\nType: user_input`}
    </pre>
    <h4 className="font-bold text-md mt-4 mb-2">Legend for Question Types</h4>
    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
      <li>`single_select_radio`</li>
      <li>`single_select_dropdown`</li>
      <li>`multiple_select`</li>
      <li>`user_input`</li>
      <li>`rating_scale`</li>
      <li>`likert_scale`</li>
      <li>`ranking`</li>
      <li>`matrix`</li>
    </ul>
  </div>
);

const parseQuestions = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let current = null;
  for (const line of lines) {
    if (/^Q\d*:/i.test(line)) {
      if (current) questions.push(current);
      current = {
        question: line.replace(/^Q\d*:\s*/i, ''),
        type: 'single_select_radio',
        answers: []
      };
    } else if (/^Type:/i.test(line) && current) {
      current.type = line.replace(/^Type:\s*/i, '').trim().toLowerCase().replace(/\s+/g, '_');
    } else if (/^A:/i.test(line) && current) {
      current.answers.push(line.replace(/^A:\s*/i, ''));
    }
  }
  if (current) questions.push(current);
  return questions;
};

export default function CreateSurveyPage() {
  const [clients, setClients] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase.from('Clients').select('*');
      if (error) console.error('Failed to load clients:', error);
      else setClients(data);
    }
    fetchClients();
  }, []);

  const handleCreate = async (formData) => {
    const toastId = toast.loading("Creating survey...");
    
    const { data, error } = await supabase.from('Surveys').insert([formData]).select().single();
    if (error || !data) {
      toast.error('Failed to create survey', { id: toastId });
      return;
    }

    const newSurvey = data;
    const rawText = formData.questions || '';
    const parsed = parseQuestions(rawText);

    if (parsed && parsed.length > 0) {
      const questionsToInsert = parsed.map((q, index) => ({
        survey_id: newSurvey.id,
        question_text: q.question,
        question_type: q.type,
        answer_option: q.answers ? q.answers.filter(Boolean) : [],
        question_order: index,
        question_number: index + 1
      }));
      const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
      if (qError) {
        toast.error('Error saving questions.', { id: toastId });
        return;
      }
    }

    await generateAndSaveModules(newSurvey.id, supabase);
    
    toast.success("Survey created successfully!", { id: toastId });
    router.push(`/dashboard/surveys/${newSurvey.id}/general`);
  };

  return (
    <div className="p-6"> 
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">🆕 Create New Survey</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-grow">
          <SurveyForm
            mode="create"
            clients={clients}
            onSubmit={handleCreate}
          />
        </div>
        <div className="w-full md:w-80 flex-shrink-0">
          <FormattingGuide />
        </div>
      </div>
    </div>
  );
}