import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SurveyForm from '../../../../components/surveys/SurveyForm';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function EditSurveyPage() {
  const router = useRouter();
  const { id } = router.query;

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchSurvey() {
      const { data, error } = await supabase
        .from('Surveys')
        .select('*, Clients(first_name, last_name)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Failed to fetch survey:', error);
      } else {
        const clientName = data.Clients
          ? `${data.Clients.first_name} ${data.Clients.last_name}`
          : '';
        setInitialData({ ...data, client_name: clientName });
      }

      setLoading(false);
    }

    fetchSurvey();
  }, [id]);

  const handleUpdate = async (values) => {
    const { error } = await supabase
      .from('Surveys')
      .update(values)
      .eq('id', id);

    if (error) {
      alert('Update failed: ' + error.message);
    } else {
      alert('Survey updated!');
    }
  };

  if (loading) {
    return <div className="p-6">Loading survey data...</div>;
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">
        📝 Edit Survey:{' '}
        <span className="text-black">{initialData?.title}</span>
        {initialData?.client_name && (
          <span className="text-gray-600 text-base ml-2">
            | Client: {initialData.client_name}
          </span>
        )}
      </h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mt-4 mb-8">
        <Link
          href={`/dashboard/surveys/${id}/general`}
          className="px-4 py-2 border border-b-0 bg-white text-blue-600 font-bold rounded-t"
        >
          General
        </Link>
        <Link
          href={`/dashboard/surveys/${id}/targeting`}
          className="px-4 py-2 border border-b-0 bg-white text-black font-semibold rounded-t"
        >
          Targeting
        </Link>
        <Link
          href={`/dashboard/surveys/${id}/quotas`}
          className="px-4 py-2 border border-b-0 bg-white text-black font-semibold rounded-t"
        >
          Quotas
        </Link>
        <Link
          href={`/dashboard/surveys/${id}/reporting`}
          className="px-4 py-2 border border-b-0 bg-white text-black font-semibold rounded-t"
        >
          Reporting
        </Link>
      </div>

      <div className="bg-white shadow p-6 rounded-md max-w-3xl">
        <SurveyForm mode="edit" initialData={initialData} onSubmit={handleUpdate} />
      </div>
    </div>
  );
}
