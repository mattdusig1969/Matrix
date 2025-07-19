import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
// Assuming these components exist from your other pages
// import ModuleProgressChart from '../../../../components/ModuleProgressChart';
// import ModuleCompletionMeter from '../../../../components-ModuleCompletionMeter';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function SurveyAdCodePage() {
  const router = useRouter();
  const { id: surveyId, tab = 'adcode' } = router.query;

  const [survey, setSurvey] = useState(null);
  const [simulateCount, setSimulateCount] = useState(10);
  const [adCode, setAdCode] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [creativeVariants, setCreativeVariants] = useState([]);
  const [selectedCreativeId, setSelectedCreativeId] = useState('');
  
  const [iframeKey, setIframeKey] = useState(Date.now());
  const iframeRef = useRef(null);
  const [isIframeReady, setIsIframeReady] = useState(false);

  useEffect(() => {
    // Listen for the 'iframe_ready' message from the embedded module
    const handleMessage = (event) => {
        if (event.data === 'iframe_ready') {
            setIsIframeReady(true);
        }
    };
    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (surveyId) {
      fetchSurvey();
      fetchCreativeVariants();
    }
  }, [surveyId]);

  async function fetchSurvey() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('id, title, target_n')
      .eq('id', surveyId)
      .single();
    if (error) toast.error('Failed to load survey details.');
    else setSurvey(data);
  }

  async function fetchCreativeVariants() {
    const { data, error } = await supabase
      .from('creativevariants')
      .select('*')
      .order('name');
    if (error) toast.error('Failed to load design styles');
    else setCreativeVariants(data || []);
  }

  async function generateIframeCode() {
    if (!surveyId) return;

    const { data: modules, error } = await supabase.from('Modules').select('id').eq('survey_id', surveyId);
    if (error || !modules?.length) {
      toast.error('No modules found for this survey. Please generate them on the Modules tab.');
      return;
    }

    const selectedModule = modules[Math.floor(Math.random() * modules.length)];
    const creativeParam = selectedCreativeId ? `&creative_id=${selectedCreativeId}` : '';
    const src = `/embed/module?survey_id=${surveyId}&module_id=${selectedModule.id}${creativeParam}`;
    
    setAdCode(src);
    setIsIframeReady(false); // Reset ready state for the new/reloaded iframe
    setIframeKey(Date.now());
  }
  
  function handleResetPreview() {
    if (iframeRef.current && isIframeReady) {
      iframeRef.current.contentWindow.postMessage('clear_session', '*');
      toast.success('Preview reset successfully.');
    } else {
      toast.error('Preview is not ready to be reset. Please wait a moment.');
    }
  }

  // This function can remain largely the same, just simplified
  async function simulateCompletes() {
    // ... This function can be copied from your generateadcode.js file ...
    // You would just need to use `surveyId` instead of `selectedSurvey.id`
    toast.success('Simulation logic would run here.');
  }

  return (
    <div className="p-10">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">📝 Edit Survey: <span className="text-black">{survey?.title}</span></h1>
      
      <div className="flex space-x-4 border-b mb-8">
        <Link href={`/dashboard/surveys/${surveyId}/general`} className={`px-4 py-2 rounded-t-lg ${tab === 'general' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>General</Link>
        <Link href={`/dashboard/surveys/${surveyId}/targeting`} className={`px-4 py-2 rounded-t-lg ${tab === 'targeting' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Targeting</Link>
        <Link href={`/dashboard/surveys/${surveyId}/modules`} className={`px-4 py-2 rounded-t-lg ${tab === 'modules' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Modules</Link>
        <Link href={`/dashboard/surveys/${surveyId}/preview`} className={`px-4 py-2 rounded-t-lg ${tab === 'preview' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Preview</Link>
        <Link href={`/dashboard/surveys/${surveyId}/adcode`} className={`px-4 py-2 rounded-t-lg ${tab === 'adcode' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Ad Code</Link>
        <Link href={`/dashboard/surveys/${surveyId}/quotas`} className={`px-4 py-2 rounded-t-lg ${tab === 'quotas' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Quotas</Link>
        <Link href={`/dashboard/surveys/${surveyId}/reporting`} className={`px-4 py-2 rounded-t-lg ${tab === 'reporting' ? 'bg-white text-blue-600 font-bold' : 'text-gray-700 font-semibold'}`}>Reporting</Link>
      </div>

      <div className="space-y-8">
        {creativeVariants.length > 0 && (
          <div className="bg-white shadow rounded p-6">
            <label className="block font-semibold mb-2">Select Design Style</label>
            <select className="w-full border px-3 py-2 rounded" value={selectedCreativeId} onChange={(e) => setSelectedCreativeId(e.target.value)}>
              <option value="">— Choose a Design Style —</option>
              {creativeVariants.map((cv) => (<option key={cv.id} value={cv.id}>{cv.name}</option>))}
            </select>
          </div>
        )}

        <div className="bg-white shadow rounded p-6 space-y-4">
          <label className="block font-semibold">Number of Completes to Simulate</label>
          <input type="number" min="1" className="border px-3 py-2 rounded w-24" value={simulateCount} onChange={(e) => setSimulateCount(Number(e.target.value))}/>
          <div className="flex flex-wrap gap-4 items-center">
            <button className="bg-blue-700 text-white px-4 py-2 rounded" onClick={simulateCompletes}>Simulate {simulateCount} Completes</button>
            <button 
              className="bg-green-700 text-white px-4 py-2 rounded"
              onClick={generateIframeCode}
              disabled={!selectedCreativeId}
            >
              🚀 Generate Ad Code
            </button>
            <button className="bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50" onClick={handleResetPreview} disabled={!adCode || !isIframeReady}>🔄 Reset Preview</button>
          </div>
        </div>

        {adCode && selectedCreativeId && (
          <div className="mt-2">
            <h3 className="font-semibold mb-2 text-lg">Ad Code & Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-2">Ad Code Snippet:</h4>
                <textarea className="w-full border p-2 font-mono text-sm" rows={5} value={`<iframe src="${adCode}" width="340" height="660" style="border:none;" allow="fullscreen"></iframe>`} readOnly />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Live Preview:</h4>
                <iframe ref={iframeRef} key={iframeKey} src={adCode} width="340" height="660" className="border shadow-lg" title="Ad Preview" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}