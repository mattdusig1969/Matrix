import SurveyForm from '../../../components/surveys/SurveyForm';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

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
    console.log("📝 Raw formData submitted:", formData);

    // Step 1: Insert survey
    const { data, error } = await supabase.from('Surveys').insert([formData]).select();
    if (error || !data?.[0]) {
      alert('Failed to create survey');
      console.error('⛔ Survey insert error:', error);
      return;
    }

    const newSurvey = data[0];
    const rawText = formData.questions || '';

    // Step 2: Parse questions
    const parsed = parseQuestions(rawText);
    console.log("🔍 Parsed Questions:", parsed);

    if (!parsed || parsed.length === 0) {
      console.warn("⚠️ No questions parsed from text.");
      router.push(`/dashboard/surveys/${newSurvey.id}/general`);
      return;
    }

    // Step 3: Insert questions
    const questionsToInsert = parsed.map((q, index) => ({
  survey_id: newSurvey.id,
  question_text: q.question,
  answer_option: q.answers.filter(Boolean),
  question_type: 'multiple_choice',
  question_order: index,
  question_number: index + 1 // ✅ Now included
}));


    console.log("📦 Questions to Insert:", questionsToInsert);

    const { data: insertedQuestions, error: qError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (qError) {
      console.error('❌ Error inserting questions:', qError);
    } else {
      console.log('✅ Successfully inserted questions:', insertedQuestions);
    }

    // Step 4: Redirect
    router.push(`/dashboard/surveys/${newSurvey.id}/general`);
  };

  const parseQuestions = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
      console.error("❌ Invalid questions text");
      return [];
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const questions = [];
    let current = null;

    for (const line of lines) {
      if (/^Q\d*:/i.test(line)) {
        if (current) questions.push(current);
        current = { question: line.replace(/^Q\d*:\s*/i, ''), answers: [] };
      } else if (/^A:/i.test(line) && current) {
        current.answers.push(line.replace(/^A:\s*/i, ''));
      }
    }

    if (current) questions.push(current);
    return questions;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🆕 Create New Survey</h1>
      <SurveyForm
        mode="create"
        clients={clients}
        onSubmit={handleCreate}
      />
    </div>
  );
}
