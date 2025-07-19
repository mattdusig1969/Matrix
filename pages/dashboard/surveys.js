import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function ManageSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [clients, setClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Live');
  const [clientFilter, setClientFilter] = useState('All');
  const router = useRouter();

  useEffect(() => {
    fetchSurveys();
    fetchClients();
  }, []);

  async function fetchSurveys() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('id, title, created_at, status, client_id')
      .order('created_at', { ascending: false });

    if (error) console.error('Error loading surveys:', error);
    else setSurveys(data);
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from('Clients')
      .select('id, first_name, last_name');

    if (error) console.error('Error loading clients:', error);
    else setClients(data);
  }

  // **UPDATED FEATURE:** Function to handle duplicating a survey and its questions
  const handleDuplicateSurvey = async (surveyId) => {
    const toastId = toast.loading('Duplicating survey...');

    try {
      // 1. Fetch the full data of the survey to duplicate
      const { data: surveyToDuplicate, error: fetchError } = await supabase
        .from('Surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch original survey: ${fetchError.message}`);
      }

      // 2. Fetch all questions associated with the original survey
      const { data: originalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId);

      if (questionsError) {
        throw new Error(`Failed to fetch original questions: ${questionsError.message}`);
      }

      // 3. Prepare the new survey object for insertion
      const { id, created_at, ...newSurveyData } = surveyToDuplicate;
      newSurveyData.title = `${newSurveyData.title} - Copy`;
      newSurveyData.status = 'Draft';

      // 4. Insert the new survey and get its ID back
      const { data: newSurvey, error: insertError } = await supabase
        .from('Surveys')
        .insert(newSurveyData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create duplicate survey: ${insertError.message}`);
      }

      // 5. If there are questions, prepare and insert them for the new survey
      if (originalQuestions && originalQuestions.length > 0) {
        const newQuestions = originalQuestions.map(q => {
          // Remove old, unique identifiers and link to the new survey
          const { id: oldId, created_at: oldCreatedAt, survey_id: oldSurveyId, module_id, ...questionData } = q;
          return {
            ...questionData,
            survey_id: newSurvey.id // Link to the new survey
          };
        });

        const { error: insertQuestionsError } = await supabase
          .from('questions')
          .insert(newQuestions);

        if (insertQuestionsError) {
          // Note: This could leave an orphaned survey if question copy fails.
          // For a more robust solution, you might implement a transaction or cleanup logic.
          throw new Error(`Survey duplicated, but failed to copy questions: ${insertQuestionsError.message}`);
        }
      }

      toast.success('Survey and questions duplicated!', { id: toastId });

      // 6. Redirect to the new survey's edit page
      router.push(`/dashboard/surveys/${newSurvey.id}/general`);

    } catch (error) {
      console.error("Duplication Error:", error);
      toast.error(error.message, { id: toastId });
    }
  };

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
  };

  const filteredSurveys = surveys.filter(s => {
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchClient = clientFilter === 'All' || s.client_id === clientFilter;
    return matchStatus && matchClient;
  });

  return (
    <div className="p-8">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">📋 Survey Dashboard</h1>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm h-9"
        >
          <option value="All">All</option>
          <option value="Live">Live</option>
          <option value="Paused">Paused</option>
          <option value="Draft">Draft</option>
        </select>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm h-9"
        >
          <option value="All">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>

        <button
          onClick={() => router.push('/dashboard/surveys/create')}
          className="ml-auto bg-blue-600 text-white px-4 py-1.5 rounded text-sm h-9 whitespace-nowrap"
        >
          + Create Survey
        </button>
      </div>

      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2">Survey Title</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date Created</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSurveys.map(survey => (
            <tr key={survey.id} className="border-t">
              <td className="px-4 py-2 font-medium text-blue-700">
                <Link href={`/dashboard/surveys/${survey.id}/general`}>{survey.title}</Link>
              </td>
              <td className="px-4 py-2">{getClientName(survey.client_id)}</td>
              <td className="px-4 py-2">{survey.status}</td>
              <td className="px-4 py-2">{new Date(survey.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-2 space-x-4">
                <Link href={`/dashboard/surveys/${survey.id}/general`}>
                  <span className="text-blue-500 hover:underline cursor-pointer">Edit</span>
                </Link>
                <span 
                  onClick={() => handleDuplicateSurvey(survey.id)}
                  className="text-green-600 hover:underline cursor-pointer"
                >
                  Duplicate
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
