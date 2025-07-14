import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import ModuleProgressChart from '../../components/ModuleProgressChart';
import ModuleCompletionMeter from '../../components/ModuleCompletionMeter';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function GenerateAdCodePage() {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [fieldsByCategory, setFieldsByCategory] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('Demographics');
  const [selectedField, setSelectedField] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [simulateCount, setSimulateCount] = useState(10);
  const [adCode, setAdCode] = useState('');
  const [simulated, setSimulated] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [creativeVariants, setCreativeVariants] = useState([]);
  const [selectedCreative, setSelectedCreative] = useState(null);
  const iframeRef = useRef(null);
  const DEFAULT_STYLE = "Style A - Bold & Clean";


useEffect(() => {
  if (selectedSurvey) {
    const srcUrl = `https://yourdomain.com/embed/module?survey_id=${selectedSurvey}`;
    const iframeCode = `<iframe src="${srcUrl}" width="340" height="660" frameborder="0" scrolling="no" style="border:none;"></iframe>`;
    setAdCode(iframeCode);
  }
}, [selectedSurvey]);


  useEffect(() => {
    fetchSurveys();
    fetchCreativeVariants();
  }, []);

  useEffect(() => {
  if (selectedSurvey && creativeVariants.length > 0 && !selectedCreative) {
    const defaultCreative = creativeVariants.find(cv => cv.name === DEFAULT_STYLE);
    if (defaultCreative) {
      setSelectedCreative(defaultCreative);
    }
  }
}, [selectedSurvey, creativeVariants]);


  async function fetchSurveys() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('id, title, target_n, country_id')
      .eq('status', 'Live');

    if (error) toast.error('Failed to load surveys');
    else setSurveys(data);
  }

  useEffect(() => {
  if (iframeRef.current && selectedCreative) {
    iframeRef.current.contentWindow.postMessage({
      type: 'update-creative',
      creativeId: selectedCreative.id,
    }, '*');
  }
}, [selectedCreative]);


  async function fetchCreativeVariants() {
    const { data, error } = await supabase.from('creativevariants').select('*').order('name');
    if (error) toast.error('Failed to load design styles');
    else setCreativeVariants(data);
  }

  async function fetchFields(countryId) {
    const [demo, geo, psycho] = await Promise.all([
      supabase.from('demoattributes').select('*').eq('country_id', countryId),
      supabase.from('geoattributes').select('*').eq('country_id', countryId),
      supabase.from('psychoattributes').select('*').eq('country_id', countryId),
    ]);

    const groupFields = (raw) => {
      const grouped = {};
      (raw?.data || []).forEach(item => {
        if (!grouped[item.field_name]) grouped[item.field_name] = new Set();
        grouped[item.field_name].add(item.value);
      });
      return Object.fromEntries(Object.entries(grouped).map(([key, val]) => [key, [...val]]));
    };

    setFieldsByCategory({
      Demographics: groupFields(demo),
      Geographics: groupFields(geo),
      Psychographics: groupFields(psycho),
    });
  }

  async function handleSurveyChange(e) {
    const survey = surveys.find(s => s.id === e.target.value);
    if (!survey) return;

    setSelectedSurvey(survey);
    setSelectedCategory('Demographics');
    setSelectedField('');
    setAdCode('');
    setSimulated(0);

    await fetchFields(survey.country_id);

    const { data, error } = await supabase
      .from('Surveys')
      .select('targeting')
      .eq('id', survey.id)
      .single();

    if (error) {
      toast.error('Failed to load targeting data');
      return;
    }

    const targeting = data?.targeting || {};
    const preselected = {};
    Object.entries(targeting).forEach(([field, values]) => {
      preselected[field] = values;
    });
    setSelectedOptions(preselected);
  }

  function toggleOption(field, option) {
    setSelectedOptions(prev => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option],
      };
    });
  }

  async function generateIframeCode() {
    if (!selectedSurvey?.id) {
      toast.error('Please select a survey');
      return;
    }

    const { data: modules, error } = await supabase
      .from('Modules')
      .select('id')
      .eq('survey_id', selectedSurvey.id);

    if (error || !modules?.length) {
      toast.error('No modules found for this survey');
      return;
    }

    const selectedModule = modules[Math.floor(Math.random() * modules.length)];
    const moduleId = selectedModule.id;
    const creativeId = selectedCreative?.id;

    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'update-creative',
        creativeId: creativeId,
      }, '*');
    } else {
      const creativeParam = creativeId ? `&creative_id=${creativeId}` : '';
      const src = `${window.location.origin}/embed/module?survey_id=${selectedSurvey.id}&module_id=${moduleId}${creativeParam}`;
      const iframe = `
        <iframe
          src="${src}"
          width="340"
          height="660"
          style="border:none;"
          allow="fullscreen"
        ></iframe>
      `.trim();
      setAdCode(iframe);
    }
  }


  async function simulateCompletes() {
    if (!selectedSurvey?.id) {
      toast.error('Please select a survey');
      return;
    }

    setIsSimulating(true);
    setSimulated(0);

    const { data: modules } = await supabase
      .from('Modules')
      .select('id')
      .eq('survey_id', selectedSurvey.id);

    const tasks = Array.from({ length: simulateCount }).map(async () => {
      const module = modules[Math.floor(Math.random() * modules.length)];
      const sessionId = uuidv4();

      const { data: questions } = await supabase
        .from('questions')
        .select('question_order, question_text, answer_option')
        .eq('module_id', module.id);

      const responses = questions?.map(q => {
        const options = typeof q.answer_option === 'string'
          ? JSON.parse(q.answer_option)
          : Array.isArray(q.answer_option)
          ? q.answer_option
          : [];

        const selected = options[Math.floor(Math.random() * options.length)];

        return selected ? {
          id: uuidv4(),
          module_id: module.id,
          user_session_id: sessionId,
          question_order: q.question_order,
          question_text: q.question_text,
          selected_answer: selected,
          completed: true,
        } : null;
      }).filter(Boolean);

      if (responses.length > 0) {
        await supabase.from('ModuleResponses').insert(responses);
        await supabase.from('SurveyCompletions').insert({
          survey_id: selectedSurvey.id,
          module_id: module.id,
          user_session_id: sessionId,
          demo_attributes: {},
          geo_attributes: {},
          psycho_attributes: {},
        });
        setSimulated(prev => prev + 1);
      }
    });

    await Promise.all(tasks);
    setIsSimulating(false);
    toast.success(`✅ Finished simulating ${simulateCount} completes.`);
  }

  return (
    <div className="p-10">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">📢 Generate Ad Code</h1>

      {/* Survey Dropdown */}
      <div className="bg-white shadow rounded p-6 mb-6">
        <label className="block font-semibold mb-2">Select Survey</label>
        <select className="w-full border px-3 py-2 rounded" onChange={handleSurveyChange}>
          <option value="">— Choose Survey —</option>
          {surveys.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {/* Targeting */}
      {selectedSurvey && (
        <div className="flex gap-6">
          {/* Left: Category / Fields / Options */}
          <div className="flex border rounded divide-x bg-white shadow w-full">
            <div className="w-1/4 p-4 bg-slate-50 border-r">
              {Object.keys(fieldsByCategory).map(cat => (
                <div
                  key={cat}
                  className={`cursor-pointer py-2 border-b ${selectedCategory === cat ? 'font-bold text-blue-700' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedField('');
                  }}
                >
                  {cat}
                </div>
              ))}
            </div>
            <div className="w-1/4 p-4 bg-slate-50 border-r">
              {Object.keys(fieldsByCategory[selectedCategory] || {}).map(field => (
                <div
                  key={field}
                  className={`cursor-pointer py-2 border-b ${selectedField === field ? 'font-bold text-blue-700' : ''}`}
                  onClick={() => setSelectedField(field)}
                >
                  {field}
                </div>
              ))}
            </div>
            <div className="w-1/2 p-4 bg-white">
              {(fieldsByCategory[selectedCategory]?.[selectedField] || []).map(option => (
                <label key={option} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={(selectedOptions[selectedField] || []).includes(option)}
                    onChange={() => toggleOption(selectedField, option)}
                    className="h-4 w-4"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {/* Targeting Summary */}
          <div className="bg-gray-50 shadow p-4 rounded-md w-80">
            <h2 className="text-md font-semibold mb-2">Targeting Summary</h2>
            {Object.keys(selectedOptions).length === 0 ? (
              <p className="text-sm italic text-gray-500">No attributes selected</p>
            ) : (
              Object.entries(selectedOptions).map(([field, values]) => (
                values.length > 0 && (
                  <div key={field} className="mb-3">
                    <div className="font-medium text-sm text-gray-700">{field}</div>
                    <ul className="ml-3 list-disc text-sm text-gray-800">
                      {values.map(val => <li key={val}>{val}</li>)}
                    </ul>
                  </div>
                )
              ))
            )}
          </div>
        </div>
      )}

      {/* Simulate Button & Generate Ad Code */}
      <div className="mt-8 bg-white shadow rounded p-6 space-y-4">
        <label className="block font-semibold">Number of Completes to Simulate</label>
        <input
          type="number"
          min="1"
          className="border px-3 py-2 rounded w-24"
          value={simulateCount}
          onChange={(e) => setSimulateCount(Number(e.target.value))}
        />

        <div className="flex flex-wrap gap-4 items-center">
          <button
            className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
            disabled={isSimulating}
            onClick={simulateCompletes}
          >
            {isSimulating ? 'Simulating...' : `Simulate ${simulateCount} Completes`}
          </button>
          <button
            className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
            onClick={generateIframeCode}
          >
            🚀 Generate Ad Code
          </button>
          <div className="text-sm text-gray-600">Simulated: {simulated}/{simulateCount}</div>
        </div>
      </div>

      {/* Creative Styles */}
      {creativeVariants.length > 0 && (
        <div className="mt-8 bg-white shadow rounded p-6">
          <label className="block font-semibold mb-2">Select Design Style</label>
          <select
            className="w-full border px-3 py-2 rounded"
            onChange={(e) => {
              const cv = creativeVariants.find(cv => cv.id === e.target.value);
              setSelectedCreative(cv);
            }}
          >
            <option value="">— Choose a Design Style —</option>
            {creativeVariants.map(cv => (
              <option key={cv.id} value={cv.id}>{cv.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Ad Code Preview */}
      {adCode && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Ad Code:</h3>
          <textarea
            className="w-full border px-3 py-2 text-sm font-mono"
            rows={5}
            value={adCode}
            readOnly
          />
          <div className="mt-4">
            <h4 className="font-semibold mb-1">Live Preview:</h4>
            <div className="flex gap-6">
              {selectedCreative?.html_code ? (
  <div className="w-[340px] h-[660px] overflow-hidden border shadow p-2">
    <div dangerouslySetInnerHTML={{ __html: selectedCreative.html_code }} />
  </div>
) : adCode ? (
  <iframe
    ref={iframeRef}
    src={adCode.match(/src="([^"]+)"/)?.[1] || ''}
    width="340"
    height="660"
    style={{ border: 'none' }}
    title="Ad Preview"
  />
) : null}

              {selectedSurvey && (
                <div className="flex flex-col gap-6 w-full">
                  <ModuleCompletionMeter surveyId={selectedSurvey.id} targetN={selectedSurvey.target_n} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
