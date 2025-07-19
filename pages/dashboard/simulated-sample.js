import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { Download, BarChart2, MessageSquare, Cloud, Save, Tag, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ModernWordCloud from '../components/ModernWordCloud';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

// --- HELPER FUNCTIONS & CONSTANTS ---
const generatePersonas = (options, count) => {
  const personas = [];
  const fields = Object.keys(options);
  if (fields.length === 0) return [];
  for (let i = 0; i < count; i++) {
    const persona = {};
    fields.forEach(field => {
      const availableOptions = options[field];
      persona[field] = availableOptions[Math.floor(Math.random() * availableOptions.length)];
    });
    personas.push(persona);
  }
  return personas;
};

const createPersonaList = (personas) => {
  return personas.map((persona, index) =>
    `Persona ${index + 1}:\n${Object.entries(persona).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`
  ).join('\n\n');
};

const createQuestionList = (questions) => {
  return questions.map((question) => {
    const { question_number, question_text, question_type, answer_option } = question;
    let instruction = '';
    switch (question_type) {
      case 'single_select_radio':
      case 'single_select_dropdown':
      case 'likert_scale':
        instruction = `(Choose one from: ${answer_option.join(', ')})`;
        break;
      case 'multiple_select':
      case 'ranking':
        instruction = `(Choose one or more from: ${answer_option.join(', ')}. For ranking, list in order of preference.)`;
        break;
      case 'rating_scale':
        instruction = `(Choose a number from ${answer_option.min || 1} to ${answer_option.max || 5}. ${answer_option.minLabel ? `${answer_option.min}: ${answer_option.minLabel}` : ''}, ${answer_option.maxLabel ? `${answer_option.max}: ${answer_option.maxLabel}` : ''})`;
        break;
      case 'matrix':
        const rows = answer_option.rows.join('; ');
        const cols = answer_option.columns.join(', ');
        instruction = `(This is a matrix. For each row (${rows}), choose one column (${cols}). Format your answer as a JSON object like {"rowName": "columnChoice"}).`;
        break;
      case 'user_input':
      default:
        instruction = '(Provide a short, open-ended answer)';
        break;
    }
    return `${question_number}. ${question_text}\n   ${instruction}`;
  }).join('\n');
};

const sentimentColors = {
  Positive: 'text-green-500',
  Negative: 'text-red-500',
  Neutral: 'text-gray-500',
};

const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

// --- REUSABLE UI COMPONENTS ---

const SurveySelection = ({ surveys, selectedSurveyId, handleSurveyChange, questionsToAsk }) => (
    <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">1. Select Survey</h2>
        <select value={selectedSurveyId} onChange={(e) => handleSurveyChange(e.target.value)} className="w-full mt-1 border px-3 py-2 rounded-md shadow-sm">
            <option value="">— Choose a survey to begin —</option>
            {surveys.map((s) => (<option key={s.id} value={s.id}>{s.title}</option>))}
        </select>
        <p className="mt-4 text-sm font-medium text-gray-800">Survey Questions ({questionsToAsk.length})</p>
        <ul className="mt-2 space-y-2 border rounded-md p-2 h-40 overflow-y-auto bg-slate-50">
            {questionsToAsk.length > 0
                ? questionsToAsk.map(q => (<li key={q.id} className="bg-white p-2 rounded shadow-sm text-sm"><span>{q.question_text}</span></li>))
                : <li className="text-center text-gray-500 text-sm py-4">Select a survey to see its questions.</li>
            }
        </ul>
    </div>
);

const AudienceStep = ({
  audienceMode, setAudienceMode, personaText, setPersonaText,
  savedAudiences, handleLoadAudience, selectedCountryId, handleCountryChange,
  countries, fieldsByCategory, selectedCategory, setSelectedCategory,
  selectedField, setSelectedField, selectedOptions, toggleOption,
  audienceName, setAudienceName, handleSaveAudience, disabled
}) => (
  <fieldset disabled={disabled} className="bg-white shadow-lg rounded-lg p-6 disabled:opacity-50">
    <div className="flex items-center mb-4 pb-2 border-b">
      <h2 className="text-lg font-semibold mr-4">2. Define Target</h2>
      <div className="flex items-center bg-gray-200 rounded-lg p-1">
        <button onClick={() => setAudienceMode('targeting')} className={`px-4 py-1 text-sm rounded-md ${audienceMode === 'targeting' ? 'bg-blue-600 text-white shadow font-semibold' : 'bg-white text-blue-600'}`}>Target Audience</button>
        <button onClick={() => setAudienceMode('persona')} className={`px-4 py-1 text-sm rounded-md ${audienceMode === 'persona' ? 'bg-blue-600 text-white shadow font-semibold' : 'bg-white text-blue-600'}`}>Submit Persona</button>
      </div>
    </div>
    {audienceMode === 'targeting' ? (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Override with Saved Audience</label>
            <select onChange={(e) => handleLoadAudience(e.target.value)} defaultValue="" className="mt-1 block w-full border px-3 py-2 rounded-md shadow-sm">
              <option value="">— Keep survey's default target —</option>
              {savedAudiences.map(aud => (<option key={aud.id} value={aud.id}>{aud.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <select value={selectedCountryId} onChange={handleCountryChange} className="mt-1 block w-full border px-3 py-2 rounded-md shadow-sm">
              <option value="All">All Countries</option>
              {countries.map(country => (<option key={country.id} value={country.id}>{country.country_name}</option>))}
            </select>
          </div>
        </div>
        <div className="flex border rounded-md divide-x bg-white h-72 mt-4">
          <div className="w-1/3 p-4 bg-slate-50 border-r overflow-y-auto">{Object.keys(fieldsByCategory).map(cat => (<div key={cat} className={`cursor-pointer py-2 px-1 border-b text-sm hover:bg-slate-100 ${selectedCategory === cat ? 'font-bold text-blue-700' : ''}`} onClick={() => { setSelectedCategory(cat); setSelectedField(''); }}>{cat}</div>))}</div>
          <div className="w-1/3 p-4 bg-slate-50 border-r overflow-y-auto">{Object.keys(fieldsByCategory[selectedCategory] || {}).map(field => (<div key={field} className={`cursor-pointer py-2 px-1 border-b text-sm hover:bg-slate-100 ${selectedField === field ? 'font-bold text-blue-700' : ''}`} onClick={() => setSelectedField(field)}>{field}</div>))}</div>
          <div className="w-1/2 p-4 bg-white overflow-y-auto">{(fieldsByCategory[selectedCategory]?.[selectedField] || []).map(option => (<label key={option} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={(selectedOptions[selectedField] || []).includes(option)} onChange={() => toggleOption(selectedField, option)} className="h-4 w-4 rounded"/><span>{option}</span></label>))}</div>
        </div>
        {Object.keys(selectedOptions).length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700">Save Current Target</label>
            <div className="flex gap-2 mt-1">
              <input value={audienceName} onChange={(e) => setAudienceName(e.target.value)} placeholder="e.g., US Coastal Millennials" className="w-full border px-3 py-2 rounded-md shadow-sm"/>
              <button onClick={handleSaveAudience} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"><Save size={16} /> Save</button>
            </div>
          </div>
        )}
      </>
    ) : (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Enter your persona below:</label>
        <textarea
            value={personaText}
            onChange={(e) => setPersonaText(e.target.value)}
            className="w-full h-48 border rounded-md p-3 shadow-sm"
            placeholder="e.g., A successful businesswoman in her late 30s, living in a major city, who values luxury and cultural experiences on her family vacations."
        />
      </div>
    )}
  </fieldset>
);

const SimulationControls = ({ simulationCount, setSimulationCount, handleGenerateSimulation, isSimulating, disabled }) => (
  <fieldset disabled={disabled} className="bg-white shadow-lg rounded-lg p-6 disabled:opacity-50">
    <h2 className="text-lg font-semibold mb-4 border-b pb-2">3. Configure & Run Simulation</h2>
    <div className="mb-4">
      <label className="block font-medium mb-1 text-sm">Number of Responses</label>
      <input type="number" min="1" max="100" className="border px-3 py-2 rounded-md w-28 text-sm" value={simulationCount} onChange={(e) => setSimulationCount(Number(e.target.value))}/>
    </div>
    <button onClick={handleGenerateSimulation} disabled={isSimulating} className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-bold disabled:bg-gray-400">{isSimulating ? 'Generating...' : 'Generate Simulated Responses'}</button>
  </fieldset>
);

const SetupColumn = ({ surveys, selectedSurveyId, handleSurveyChange, questionsToAsk, ...props }) => (
    <div className="space-y-8">
        <SurveySelection {...{ surveys, selectedSurveyId, handleSurveyChange, questionsToAsk }} />
        <AudienceStep {...props} />
        <SimulationControls {...props} />
    </div>
);

const RawDataDisplay = ({ results, questions, onExport }) => (
    <div>
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Raw Simulation Data</h2>
            <button onClick={onExport} disabled={results.length === 0} className="flex items-center gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1.5 rounded-md shadow-sm text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              <Download size={16} /> Download CSV
            </button>
        </div>
        <div className="space-y-6 mt-4 border rounded-lg p-4 max-h-[calc(100vh-12rem)] overflow-y-auto bg-slate-50">
            {results.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Raw results will appear here...</p>
            ) : (
                results.map((result, index) => (
                    <div key={result.id || index} className="bg-white p-4 rounded shadow">
                        <p className="font-semibold text-blue-800">
                            Respondent #{result.respondent_number || (index + 1)}: <span className="font-normal text-gray-700">{result.archetype}</span>
                        </p>
                        <div className="mt-2 text-xs text-gray-600 border-t pt-2">
                            <strong>Profile:</strong> {Object.entries(result.demographicProfile || {}).map(([key, value]) => `${key}: ${value}`).join('; ')}
                        </div>
                        <div className="mt-3 space-y-3 border-t pt-3">
                            {(result.answers || []).map((item, qIndex) => {
                                const question = questions.find(q => String(q.question_number) === String(item.question_number));
                                return (
                                    <div key={qIndex} className="text-sm">
                                        <p className="font-medium text-gray-800">{question ? question.question_text : `Question #${item.question_number}`}</p>
                                        <p className="text-gray-600 pl-2 border-l-2 border-gray-300 ml-1 mt-1">{String(item.answer)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
);

const CodeTally = ({ results }) => {
    const tally = results.reduce((acc, result) => {
        (result.answers || []).forEach(answer => {
            if (answer.codes && Array.isArray(answer.codes)) {
                answer.codes.forEach(code => {
                    acc[code] = (acc[code] || 0) + 1;
                });
            }
        });
        return acc;
    }, {});
    const sortedTally = Object.entries(tally).sort(([, a], [, b]) => b - a);
    if (sortedTally.length === 0) return null;
    return (
        <div className="bg-white p-4 rounded-lg shadow mb-8">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Tag size={18} /> Coding Tally:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2">
                {sortedTally.map(([code, count]) => (
                    <div key={code} className="flex justify-between text-sm border-b py-1">
                        <span className="font-medium text-gray-700">{code}:</span>
                        <span className="text-gray-900 font-semibold">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const OpenEndedResponse = ({ result, questions, onCodeSave, onCodeRemove }) => {
    const [newCode, setNewCode] = useState('');
    const openEndedAnswers = (result.answers || []).filter(a => {
        const question = questions.find(q => String(q.question_number) === String(a.question_number));
        return question?.question_type === 'user_input';
    });
    
    const handleAddCode = (answer) => {
        if (!newCode.trim()) return;
        onCodeSave(result.id, answer.question_number, newCode.trim());
        setNewCode('');
    };

    return (
        <div className="border-t pt-4 first:border-t-0">
            <p className="font-semibold text-blue-800">Respondent #{result.respondent_number}: <span className="font-normal text-gray-600">{result.archetype}</span></p>
            <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                <strong>Profile:</strong> {Object.entries(result.demographicProfile || {}).map(([key, value]) => `${key}: ${value}`).join('; ')}
            </div>
            <div className="mt-2 space-y-4">
                {openEndedAnswers.map((answer, index) => {
                    const question = questions.find(q => String(q.question_number) === String(answer.question_number));
                    return (
                        <div key={index} className="text-sm pt-2">
                            <p className="font-semibold text-gray-700">{question?.question_text}</p>
                            <p className="pl-2 mt-1">{answer.answer}</p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {(answer.codes || []).map(code => (
                                    <span key={code} className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        {code}
                                        <button onClick={() => onCodeRemove(result.id, answer.question_number, code)} className="text-green-600 hover:text-green-800 ml-1"><X size={12}/></button>
                                    </span>
                                ))}
                                <form onSubmit={(e) => { e.preventDefault(); handleAddCode(answer); }} className="flex items-center gap-1">
                                    <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Add code..." className="border rounded px-2 py-0.5 text-xs w-28"/>
                                </form>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function SimulatedSamplePage() {
  const [activeTab, setActiveTab] = useState('Setup');
  const [audienceMode, setAudienceMode] = useState('targeting');
  const [personaText, setPersonaText] = useState('');
  const [countries, setCountries] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [fieldsByCategory, setFieldsByCategory] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('Demographics');
  const [selectedField, setSelectedField] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [questionsToAsk, setQuestionsToAsk] = useState([]);
  const [simulationCount, setSimulationCount] = useState(5);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState([]);
  const [analysis, setAnalysis] = useState({ charts: [], sentiments: {}, wordCloud: [], codes: [] });
  const [savedAudiences, setSavedAudiences] = useState([]);
  const [audienceName, setAudienceName] = useState('');
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');

  useEffect(() => {
    async function getInitialData() {
      const { data } = await supabase.from('Country').select('id, country_name').order('country_name');
      const countryData = data || [];
      setCountries(countryData);
      const usa = countryData.find(c => c.country_name === 'United States');
      setSelectedCountryId(usa ? usa.id : 'All');
      const { data: surveysData } = await supabase.from('Surveys').select('id, title, targeting').eq('status', 'Live').order('title');
      setSurveys(surveysData || []);
      const { data: audiencesData } = await supabase.from('SavedAudiences').select('*').order('name');
      setSavedAudiences(audiencesData || []);
    }
    getInitialData();
  }, []);

  useEffect(() => {
    if (!selectedCountryId) return;
    async function fetchAttributesForCountry() {
      const buildQuery = (tableName) => {
        let query = supabase.from(tableName).select('field_name, value');
        if (selectedCountryId !== 'All') query = query.eq('country_id', selectedCountryId);
        return query;
      };
      const [demoRaw, geoRaw, psychoRaw] = await Promise.all([
        buildQuery('demoattributes'),
        buildQuery('geoattributes'),
        buildQuery('psychoattributes'),
      ]);
      const groupFields = (raw) => Object.entries((raw?.data || []).reduce((acc, item) => {
        if (!acc[item.field_name]) acc[item.field_name] = new Set();
        acc[item.field_name].add(item.value);
        return acc;
      }, {})).reduce((acc, [name, values]) => ({ ...acc, [name]: Array.from(values).sort() }), {});
      setFieldsByCategory({ Demographics: groupFields(demoRaw), Geographics: groupFields(geoRaw), Psychographics: groupFields(psychoRaw) });
    }
    fetchAttributesForCountry();
  }, [selectedCountryId]);

  const generateAnalysis = useCallback(async (results, questions) => {
    if (!results || results.length === 0) return;
    const simpleChartableTypes = ['single_select_radio', 'single_select_dropdown', 'rating_scale', 'likert_scale'];
    const multiSelectTypes = ['multiple_select', 'ranking'];
    const chartData = [];
    questions.forEach(q => {
      const chartable = simpleChartableTypes.includes(q.question_type) || multiSelectTypes.includes(q.question_type);
      if (chartable) {
        const counts = results.reduce((acc, result) => {
          const answerObj = result.answers.find(a => String(a.question_number) === String(q.question_number));
          if (answerObj && answerObj.answer) {
            if (multiSelectTypes.includes(q.question_type)) {
              String(answerObj.answer).split(',').map(s => s.trim()).forEach(ans => { acc[ans] = (acc[ans] || 0) + 1; });
            } else {
              acc[answerObj.answer] = (acc[answerObj.answer] || 0) + 1;
            }
          }
          return acc;
        }, {});
        chartData.push({ question: q.question_text, data: Object.entries(counts).map(([name, value]) => ({ name, count: value })) });
      }
    });

const openEndedAnswers = results.flatMap(r => r.answers.filter(a => {
        const q = questions.find(q => String(q.question_number) === String(a.question_number));
        return q?.question_type === 'user_input';
    }));

    if (openEndedAnswers.length > 0) {
      const toastId = toast.loading("Analyzing open-ended answers...");
      try {
        const response = await fetch('/api/analyze-text', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ answers: openEndedAnswers.map(a => a.answer) }) 
        });
        if (!response.ok) throw new Error("Analysis API failed");

        const analysisResults = await response.json();
        setAnalysis({ charts: chartData, wordCloud: analysisResults.keywords || [], sentiments: {}, codes: analysisResults.codes || [] });
        
        // --- NEW: UPDATE DATABASE WITH CODES ---
        const updatedResults = [...results];
        let openEndedIndex = 0;
        
        for (const result of updatedResults) {
            let hasChanges = false;
            for (const answer of result.answers) {
                const question = questions.find(q => String(q.question_number) === String(answer.question_number));
                if (question?.question_type === 'user_input') {
                    if (analysisResults.codes[openEndedIndex]) {
                        answer.codes = analysisResults.codes[openEndedIndex];
                        hasChanges = true;
                    }
                    openEndedIndex++;
                }
            }
            if (hasChanges) {
                await supabase.from('simulation_results').update({ answers: result.answers }).eq('id', result.id);
            }
        }
        setSimulationResults(updatedResults);
        // --- END OF NEW LOGIC ---

        toast.success("Analysis complete!", { id: toastId });
      } catch (error) {
        toast.error("Could not analyze text.", { id: toastId });
        setAnalysis({ charts: chartData, sentiments: {}, wordCloud: [], codes: [] });
      }
    } else {
      setAnalysis({ charts: chartData, sentiments: {}, wordCloud: [], codes: [] });
    }
  }, []);

  const handleSurveyChange = async (surveyId) => {
      setSelectedSurveyId(surveyId);
      if (!surveyId) {
          setQuestionsToAsk([]);
          setSelectedOptions({});
          setSimulationResults([]);
          return;
      }
      const selectedSurvey = surveys.find(s => s.id === surveyId);
      if (selectedSurvey) {
          setSelectedOptions(selectedSurvey.targeting || {});
          toast.success("Default audience loaded.");
          const { data, error } = await supabase.from('questions').select('*').eq('survey_id', surveyId).order('question_number');
          if (error) {
              toast.error("Failed to load questions.");
              setQuestionsToAsk([]);
          } else {
              setQuestionsToAsk(data || []);
          }
          const {data: existingResults, error: resultsError} = await supabase.from('simulation_results').select('*').eq('survey_id', surveyId).order('respondent_number');
          if(resultsError) {
              toast.error("Could not load existing simulation results.");
              setSimulationResults([]);
          } else {
              if (existingResults && existingResults.length > 0) {
                  setSimulationResults(existingResults);
                  generateAnalysis(existingResults, data || []);
              } else {
                  setSimulationResults([]);
              }
          }
      }
  };

  const handleCountryChange = (e) => { setSelectedCountryId(e.target.value); setSelectedOptions({}); };
  const toggleOption = useCallback((field, option) => { setSelectedOptions(prev => { const newSet = new Set(prev[field] || []); newSet.has(option) ? newSet.delete(option) : newSet.add(option); const newOptions = { ...prev, [field]: Array.from(newSet) }; if (newOptions[field].length === 0) delete newOptions[field]; return newOptions; }); }, []);
  const handleLoadAudience = (audienceId) => { if (!audienceId) return; const aud = savedAudiences.find(a => a.id === audienceId); if (aud) setSelectedOptions(aud.targeting_json || {}); };
  const handleSaveAudience = async () => { if (!audienceName.trim()) return; const { data } = await supabase.from('SavedAudiences').insert({ name: audienceName.trim(), targeting_json: selectedOptions }).select(); setSavedAudiences(prev => [...prev, ...data]); toast.success("Audience saved!"); };

  const handleGenerateSimulation = async () => {
    if (!selectedSurveyId || questionsToAsk.length === 0) {
      return toast.error("Please select a survey with questions.");
    }
    setIsSimulating(true);
    setSimulationResults([]);
    const allResults = [];
    const toastId = toast.loading("Starting simulation...");
    const sessionId = uuidv4();
    const CHUNK_SIZE = 10;
    const numChunks = Math.ceil(simulationCount / CHUNK_SIZE);
    
    try {
      await supabase.from('simulation_results').delete().eq('survey_id', selectedSurveyId);

      for (let i = 0; i < numChunks; i++) {
        toast.loading(`Processing batch ${i + 1} of ${numChunks}...`, { id: toastId });
        const currentChunkSize = Math.min(CHUNK_SIZE, simulationCount - (i * CHUNK_SIZE));
        let personaPromptContent = '';
        if (audienceMode === 'targeting') {
          if (Object.keys(selectedOptions).length === 0) throw new Error("Please define a target audience.");
          const personas = generatePersonas(selectedOptions, currentChunkSize);
          personaPromptContent = `Generate one survey response for EACH of the ${currentChunkSize} personas listed below.\n\n**Personas List:**\n${createPersonaList(personas)}`;
        } else {
          if (!personaText.trim()) throw new Error("Please enter a persona description.");
          personaPromptContent = `Generate ${currentChunkSize} diverse survey responses based on the following single persona description.\n\n**Base Persona:**\n${personaText}`;
        }
        
        const questionListForPrompt = createQuestionList(questionsToAsk);
        const prompt = `${personaPromptContent}

**Instructions for EACH response:**
1. Create a brief, one-sentence "Persona Archetype". For persona-based generation, this should be a unique variation based on the base persona.
2. Answer the survey questions from the perspective of that persona.

**Survey Questions:**
${questionListForPrompt}

**Output Format:**
Return your response as a single, valid JSON object with a single key: "responses". The value of "responses" should be an array of objects. Each object must have three keys: "demographicProfile", "archetype", and "answers". For persona-based generation, the "demographicProfile" can be a simple object with a "description" key holding the base persona text. The "answers" key must contain a valid JSON array of objects, where each object has "question_number" and "answer" keys.`;

        const response = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'A simulation batch failed.');
        }

        const data = await response.json();
        const cleanedResponses = (data.responses || []).map((result, idx) => ({ 
            session_id: sessionId,
            survey_id: selectedSurveyId,
            respondent_number: (i * CHUNK_SIZE) + idx + 1,
            demographicProfile: result.demographicProfile,
            archetype: result.archetype,
            answers: Array.isArray(result.answers) ? result.answers : [] 
        }));
        
        const { data: insertedData, error } = await supabase.from('simulation_results').insert(cleanedResponses).select();
        if (error) throw error;
        
        allResults.push(...insertedData);
        setSimulationResults([...allResults]);
      }

      await generateAnalysis(allResults, questionsToAsk);
      toast.success("Simulation complete! Report is ready.", { id: toastId });
      
      try {
        const completionSound = new Audio('/simulation-done.mp3');
        completionSound.play();
      } catch (soundError) {
        console.error("Could not play sound:", soundError);
      }

    } catch (error) {
      toast.error(`Simulation failed: ${error.message}`, { id: toastId });
    } finally {
      setIsSimulating(false);
    }
  };
  
  const handleSaveCode = async (resultId, questionNumber, newCode) => {
      const resultsCopy = [...simulationResults];
      const resultIndex = resultsCopy.findIndex(r => r.id === resultId);
      if(resultIndex === -1) return;
      const resultToUpdate = resultsCopy[resultIndex];
      const answerIndex = resultToUpdate.answers.findIndex(a => String(a.question_number) === String(questionNumber));
      if(answerIndex === -1) return;
      
      const currentCodes = resultToUpdate.answers[answerIndex].codes || [];
      if (currentCodes.includes(newCode)) return;
      
      resultToUpdate.answers[answerIndex].codes = [...currentCodes, newCode];

      const { error } = await supabase
        .from('simulation_results')
        .update({ answers: resultToUpdate.answers })
        .eq('id', resultId);
      
      if(error) {
          toast.error("Failed to save code.");
          console.error(error);
      } else {
          setSimulationResults(resultsCopy);
          toast.success("Code added!");
      }
  };
  
  const handleCodeRemove = async (resultId, questionNumber, codeToRemove) => {
      const resultsCopy = [...simulationResults];
      const resultIndex = resultsCopy.findIndex(r => r.id === resultId);
      if(resultIndex === -1) return;
      const resultToUpdate = resultsCopy[resultIndex];
      const answerIndex = resultToUpdate.answers.findIndex(a => String(a.question_number) === String(questionNumber));
      if(answerIndex === -1) return;

      resultToUpdate.answers[answerIndex].codes = (resultToUpdate.answers[answerIndex].codes || []).filter(c => c !== codeToRemove);
      
      const { error } = await supabase
        .from('simulation_results')
        .update({ answers: resultToUpdate.answers })
        .eq('id', resultId);
        
      if(error) {
          toast.error("Failed to remove code.");
      } else {
          setSimulationResults(resultsCopy);
      }
  };

  const exportToCSV = () => {
    if (simulationResults.length === 0) return toast.error("No results to export.");
    const headers = ['Respondent #', 'Archetype'];
    const profileKeys = Object.keys(simulationResults[0].demographicProfile || {});
    headers.push(...profileKeys.map(k => `Profile: ${k}`));
    questionsToAsk.forEach(q => {
        if (q.question_type === 'matrix' && q.answer_option?.rows) {
            q.answer_option.rows.forEach(row => headers.push(`${q.question_text} - ${row}`));
        } else {
            headers.push(q.question_text);
        }
    });
    const rows = simulationResults.map((result, index) => {
        const row = [result.respondent_number || (index + 1), `"${result.archetype.replace(/"/g, '""')}"`];
        profileKeys.forEach(key => row.push((result.demographicProfile || {})[key] || ''));
        questionsToAsk.forEach(q => {
            const answerObj = result.answers.find(a => String(a.question_number) === String(q.question_number));
            if (q.question_type === 'matrix' && q.answer_option?.rows) {
                let matrixAnswer = {};
                try { matrixAnswer = typeof answerObj.answer === 'string' ? JSON.parse(answerObj.answer) : (answerObj?.answer || {}); } catch (e) {}
                q.answer_option.rows.forEach(rowName => row.push(matrixAnswer[rowName] || ''));
            } else {
                row.push(answerObj ? `"${String(answerObj.answer).replace(/"/g, '""')}"` : '');
            }
        });
        return row.join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'simulated_sample_results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSetupDisabled = !selectedSurveyId;

  return (
    <div className="p-10 bg-slate-50 min-h-screen">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-2 text-slate-800">🧪 Simulated Sample</h1>
      <div className="flex">
        <button onClick={() => setActiveTab('Setup')} className={`rounded-t-md px-4 py-2 text-sm font-semibold ${ activeTab === 'Setup' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600' }`}>1. Setup Simulation</button>
        <button onClick={() => setActiveTab('Reporting')} disabled={simulationResults.length === 0} className={`rounded-t-md px-4 py-2 text-sm font-semibold ml-1 ${ activeTab === 'Reporting' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} disabled:bg-gray-100 disabled:text-gray-400`}>2. View Report</button>
      </div>

      {activeTab === 'Setup' && (
        <div className="bg-white shadow-lg rounded-b-lg rounded-tr-lg p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SetupColumn {...{ surveys, selectedSurveyId, handleSurveyChange, questionsToAsk, savedAudiences, handleLoadAudience, selectedCountryId, handleCountryChange, countries, fieldsByCategory, selectedCategory, setSelectedCategory, selectedField, setSelectedField, selectedOptions, toggleOption, audienceName, setAudienceName, handleSaveAudience, simulationCount, setSimulationCount, handleGenerateSimulation, isSimulating, audienceMode, setAudienceMode, personaText, setPersonaText, disabled: isSetupDisabled }} />
            <RawDataDisplay results={simulationResults} questions={questionsToAsk} onExport={exportToCSV} />
          </div>
        </div>
      )}

      {activeTab === 'Reporting' && (
        <div className="bg-white shadow-lg rounded-b-lg rounded-tr-lg p-6 space-y-8">
          <div className="flex justify-end mb-4">
            <button onClick={exportToCSV} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded shadow text-sm font-semibold">
              <Download size={16} /> Download CSV
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart2 size={24} /> Response Distribution</h2>
            {analysis.charts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {analysis.charts.map(chart => (
                    <div key={chart.question}>
                      <h3 className="font-semibold text-gray-700 mb-2">{chart.question}</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chart.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip cursor={{fill: '#f1f5f9'}}/>
                          <Bar dataKey="count">{chart.data.map((entry, index) => (<Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />))}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                ))}
                </div>
            ) : <p className="text-gray-500">No chartable questions were included in the simulation.</p>}
          </div>
          {analysis.wordCloud.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Cloud size={24} /> Keyword Cloud</h2>
              <ModernWordCloud data={analysis.wordCloud} />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><MessageSquare size={24} /> Open-Ended Responses</h2>
            <CodeTally results={simulationResults} />
            <div className="space-y-6">
              {simulationResults.map(result => (
                  <OpenEndedResponse 
                      key={result.id}
                      result={result}
                      questions={questionsToAsk}
                      onCodeSave={handleSaveCode}
                      onCodeRemove={handleCodeRemove}
                  />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}