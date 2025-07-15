import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import ModuleProgressChart from '../../components/ModuleProgressChart';
import ModuleCompletionMeter from '../../components/ModuleCompletionMeter';
import { supabase } from '../../lib/supabaseClient';

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
  const DEFAULT_STYLE = "Style A - Bold & Clean";
  const [selectedCreativeId, setSelectedCreativeId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');



  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    fetchCreativeVariants();
  }, []);

  useEffect(() => {
  if (selectedSurvey && creativeVariants.length > 0 && !selectedCreative) {
    const defaultCreative = creativeVariants.find(cv => cv.name === DEFAULT_STYLE);
    if (defaultCreative) {
      setSelectedCreative(defaultCreative);
      setSelectedCreativeId(defaultCreative.id); // Add this line
    }
  }
}, [selectedSurvey, creativeVariants]);

useEffect(() => {
  if (selectedSurvey?.id && selectedCreativeId) {
    supabase
      .from('Modules')
      .select('id')
      .eq('survey_id', selectedSurvey.id)
      .then(({ data, error }) => {
        if (data?.length) {
          const selectedModule = data[Math.floor(Math.random() * data.length)];
          const creativeParam = selectedCreativeId ? `&creative_id=${selectedCreativeId}` : '';
          const src = `${window.location.origin}/embed/module?survey_id=${selectedSurvey.id}&module_id=${selectedModule.id}${creativeParam}`;
          setSelectedModuleId(selectedModule.id);
          setAdCode(src);
        }
      });
  }
}, [selectedSurvey?.id, selectedCreativeId]);


  async function fetchCreativeVariants() {
  const { data, error } = await supabase
    .from('creativevariants')
    .select('*')
    .order('name');
  if (error) toast.error('Failed to load design styles');
  else setCreativeVariants(data);
}

  async function fetchSurveys() {
    const { data, error } = await supabase
      .from('Surveys')
      .select('id, title, target_n, country_id')
      .eq('status', 'Live')
      .limit(1000);

    if (error) toast.error('Failed to load surveys');
    else setSurveys(data);
  }

  async function fetchFields(countryId) {
    const [demoRaw, geoRaw, psychoRaw] = await Promise.all([
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
      return Object.entries(grouped).reduce((acc, [name, values]) => {
        acc[name] = Array.from(values);
        return acc;
      }, {});
    };

    setFieldsByCategory({
      Demographics: groupFields(demoRaw),
      Geographics: groupFields(geoRaw),
      Psychographics: groupFields(psychoRaw),
    });
  }

  async function handleSurveyChange(e) {
  const selected = surveys.find(s => s.id === e.target.value);
  if (!selected) return;

  setSelectedSurvey(selected);
  setSelectedCategory('Demographics');
  setSelectedField('');
  setAdCode('');
  setSimulated(0);

  await fetchFields(selected.country_id);

  // Fetch stored targeting
  const { data, error } = await supabase
    .from('Surveys')
    .select('targeting')
    .eq('id', selected.id)
    .single();

  if (error) {
    toast.error('Failed to load targeting data');
    return;
  }

  const preselectedOptions = {};
  const targeting = data?.targeting || {};

  // Directly apply targeting values to selectedOptions state
  Object.entries(targeting).forEach(([field, values]) => {
    preselectedOptions[field] = values;
  });

  setSelectedOptions(preselectedOptions);
}


  function toggleOption(field, option) {
    setSelectedOptions(prev => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option]
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
  setSelectedModuleId(selectedModule.id);
  const creativeId = selectedCreative?.id;
  const creativeParam = creativeId ? `&creative_id=${creativeId}` : '';
  const src = `${window.location.origin}/embed/module?survey_id=${selectedSurvey.id}&module_id=${selectedModule.id}${creativeParam}`;

  setAdCode(src);

}


  async function simulateCompletes() {
    if (!selectedSurvey?.id) {
      toast.error('Please select a survey');
      return;
    }

    setIsSimulating(true);
    setSimulated(0);

    try {
      const { data: modules } = await supabase
        .from('Modules')
        .select('id')
        .eq('survey_id', selectedSurvey.id);

      const tasks = Array.from({ length: simulateCount }).map(async () => {
        const selectedModule = modules[Math.floor(Math.random() * modules.length)];
        const sessionId = uuidv4();

        const { data: questions, error: qError } = await supabase
          .from('questions')
          .select('question_order, question_text, answer_option')
          .eq('module_id', selectedModule.id);

        if (qError || !questions?.length) return;

        const responseBatch = questions.map(q => {
          let options = [];

          try {
            options = typeof q.answer_option === 'string'
              ? JSON.parse(q.answer_option)
              : Array.isArray(q.answer_option)
              ? q.answer_option
              : [];
          } catch (err) {
            console.error("❌ Error parsing answer_option:", q.answer_option, err);
          }

          const selected = options.length > 0
            ? options[Math.floor(Math.random() * options.length)]
            : null;

          return selected ? {
            id: uuidv4(),
            module_id: selectedModule.id,
            user_session_id: sessionId,
            question_order: q.question_order,
            question_text: q.question_text,
            selected_answer: selected,
            completed: false
          } : null;
        }).filter(Boolean);

        if (responseBatch.length > 0) {
          const insertResult = await supabase
            .from('ModuleResponses')
            .insert(responseBatch);

          if (insertResult.error) {
            console.error('❌ Supabase insert error:', insertResult.error);
            toast.error('Insert failed. Check console.');
            return;
          }

          const { error: updateError } = await supabase
            .from('ModuleResponses')
            .update({ completed: true })
            .eq('user_session_id', sessionId)
            .eq('module_id', selectedModule.id);

          if (updateError) {
            console.error('❌ Update failed:', updateError);
            toast.error('Update failed. Check console.');
          } else {
            setSimulated(prev => prev + 1);
          }

          // Insert to SurveyCompletions if not already present
const { data: moduleData } = await supabase
  .from('Modules')
  .select('survey_id')
  .eq('id', selectedModule.id)
  .single();

if (moduleData?.survey_id) {
  const { error: insertError } = await supabase
    .from('SurveyCompletions')
    .insert({
      survey_id: moduleData.survey_id,
      module_id: selectedModule.id,
      user_session_id: sessionId,
      demo_attributes: {}, // Simulated users have no attributes
      geo_attributes: {},
      psycho_attributes: {}
    });

  if (insertError) {
    console.error('❌ SurveyCompletions insert error:', insertError);
  }
}
        }
      });

      await Promise.all(tasks);
      toast.success(`✅ Finished simulating ${simulateCount} completes.`);
    } catch (err) {
      console.error("❌ Simulation error:", err);
      toast.error('Simulation error');
    }

    setIsSimulating(false);
  }

return (
  <div className="p-10">
    <Toaster />
    <h1 className="text-2xl font-bold mb-6">📢 Generate Ad Code</h1>

    {/* Survey Dropdown */}
    <div className="bg-white shadow rounded p-6 mb-6">
      <label className="block font-semibold mb-2">Select Survey</label>
      <select
        className="w-full border px-3 py-2 rounded"
        onChange={handleSurveyChange}
      >
        <option value="">— Choose Survey —</option>
        {surveys.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
    </div>

    {/* Creative Style Dropdown */}
    {creativeVariants.length > 0 && (
      <div className="bg-white shadow rounded p-6 mb-6">
        <label className="block font-semibold mb-2">Select Design Style</label>
        <select
          className="w-full border px-3 py-2 rounded"
          value={selectedCreativeId}
          onChange={(e) => {
          setSelectedCreativeId(e.target.value);
          const selected = creativeVariants.find(cv => cv.id === e.target.value);
          setSelectedCreative(selected);
  }}
        >
          <option value="">— Choose a Design Style —</option>
          {creativeVariants.map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.name}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* Targeting UI */}
    {selectedSurvey && (
      <div className="flex gap-6">
        {/* Fields UI */}
        <div className="flex border rounded divide-x bg-white shadow w-full">
          {/* Categories */}
          <div className="w-1/4 p-4 bg-slate-50 border-r">
            {Object.keys(fieldsByCategory).map((cat) => (
              <div
                key={cat}
                className={`cursor-pointer py-2 border-b hover:bg-slate-100 flex justify-between items-center ${
                  selectedCategory === cat ? 'font-bold text-blue-700' : ''
                }`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedField('');
                }}
              >
                <span>{cat}</span>
              </div>
            ))}
          </div>

          {/* Fields */}
          <div className="w-1/4 p-4 bg-slate-50 border-r">
            {Object.keys(fieldsByCategory[selectedCategory] || {}).map((field) => (
              <div
                key={field}
                className={`cursor-pointer py-2 border-b hover:bg-slate-100 ${
                  selectedField === field ? 'font-bold text-blue-700' : ''
                }`}
                onClick={() => setSelectedField(field)}
              >
                {field}
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="w-1/2 p-4 bg-white">
            {(fieldsByCategory[selectedCategory]?.[selectedField] || []).map((option) => (
              <label key={option} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={(selectedOptions[selectedField] || []).includes(option)}
                  onChange={() => toggleOption(selectedField, option)}
                  className="h-4 w-4"
                />
                <span>{option}</span>
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
            Object.entries(selectedOptions).map(([field, values]) =>
              values.length > 0 ? (
                <div key={field} className="mb-3">
                  <div className="font-medium text-sm text-gray-700">{field}</div>
                  <ul className="ml-3 list-disc text-sm text-gray-800">
                    {values.map((val) => (
                      <li key={val}>{val}</li>
                    ))}
                  </ul>
                </div>
              ) : null
            )
          )}
        </div>
      </div>
    )}

    {/* Simulate + Generate Buttons */}
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

        <div className="text-sm text-gray-600">
          Simulated: {simulated}/{simulateCount}
        </div>
      </div>
    </div>

    {/* Ad Code Display */}
    {adCode && (
      <div className="mt-10">
        <h3 className="font-semibold mb-2">Ad Code Snippet:</h3>
        <textarea
          className="w-full border px-3 py-2 text-sm font-mono"
          rows={5}
          value={`<iframe src="${adCode}" width="340" height="660" style="border:none;" allow="fullscreen"></iframe>`}
          readOnly
        />

        <h4 className="font-semibold mt-4 mb-1">Live Preview:</h4>
        <iframe
          src={adCode}
          width="340"
          height="660"
          style={{ border: 'none' }}
          title="Ad Preview"
        />

        <div className="mt-6">
          <ModuleCompletionMeter
            surveyId={selectedSurvey.id}
            targetN={selectedSurvey.target_n}
          />
        </div>
      </div>
    )}
    </div> // End of main wrapper
);
} // End of function