import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EmbeddedModule() {
  const router = useRouter();
  const module_id = router.query?.module_id;
  const survey_id = router.query?.survey_id;
  const creative_id = router.query?.creative_id;
  const [creativeStyle, setCreativeStyle] = useState('');
  const [creativeHtml, setCreativeHtml] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [responses, setResponses] = useState({});
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [showEnd, setShowEnd] = useState(false);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [targetingFields, setTargetingFields] = useState([]);
  const [demoPageIndex, setDemoPageIndex] = useState(0);
  const [targetingRules, setTargetingRules] = useState({});

  function resetSession() {
    localStorage.removeItem('user_session_id');
    window.location.reload();
  }

  function parseStyle(cssText) {
    const style = {};
    cssText.split(';').forEach(rule => {
      const parts = rule.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
        style[key] = parts[1].trim();
      }
    });
    return style;
  }

  useEffect(() => {
    if (!creative_id) return;

    const fetchCreativeData = async () => {
      const { data, error } = await supabase
        .from('creativevariants')
        .select('html_code, css_code')
        .eq('id', creative_id)
        .single();

      if (error) {
        console.error('❌ Error loading creative style:', error);
        setCreativeStyle({});
        setCreativeHtml('');
        return;
      }

      const parsedCss = data.css_code ? parseStyle(data.css_code) : {};
      setCreativeStyle(parsedCss);
      setCreativeHtml(data.html_code || '');
    };

    fetchCreativeData();
  }, [creative_id]);





  useEffect(() => {
    const existingSession = localStorage.getItem('user_session_id');
    const id = existingSession || uuidv4();
    if (!existingSession) localStorage.setItem('user_session_id', id);
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (sessionId && survey_id) checkUserSession();
  }, [sessionId, survey_id]);

  useEffect(() => {
    if (module_id && userExists) fetchModuleQuestions();
  }, [module_id, userExists]);

  async function checkUserSession() {
    const { data: existingUser, error } = await supabase
      .from('usersessions')
      .select('*')
      .eq('user_session_id', sessionId)
      .maybeSingle();

    if (error) console.error('❌ usersessions query error:', error);

    if (existingUser) {
      setUserExists(true);
      setResponses(existingUser.demo_attributes || {});
    } else {
      const { data: surveyData } = await supabase
        .from('Surveys')
        .select('targeting, country_id')
        .eq('id', survey_id)
        .maybeSingle();

      const targeting = surveyData?.targeting || {};
      const country_id = surveyData?.country_id;
      const fieldNames = Object.keys(targeting);
      setTargetingRules(targeting);

      const allFields = await Promise.all(
        fieldNames.map(async (field_name) => {
          let sourceTable = 'demoattributes';
          if (['State', 'Country'].includes(field_name)) sourceTable = 'geoattributes';
          if (['Values', 'Lifestyle'].includes(field_name)) sourceTable = 'psychoattributes';

          const { data } = await supabase
            .from(sourceTable)
            .select('value')
            .eq('field_name', field_name)
            .eq('country_id', country_id);

          const values = data?.map((row) => row.value).filter((v, i, a) => a.indexOf(v) === i).sort() || [];
          return { field_name, values };
        })
      );

      setTargetingFields(allFields);

      const isSimulated = window.location.search.includes('simulate=true');
      if (isSimulated) {
        const sim = {};
        allFields.forEach(({ field_name, values }) => {
          const random = values[Math.floor(Math.random() * values.length)];
          sim[field_name] = random;
        });
        await supabase.from('usersessions').insert({ user_session_id: sessionId, demo_attributes: sim });
        setResponses(sim);
        if (!matchesTargeting(sim, targeting)) {
          setShowEnd(true);
        } else {
          setUserExists(true);
        }
      } else {
        setShowDemoPrompt(true);
      }
    }
  }

  function matchesTargeting(user, targeting) {
    return Object.entries(targeting).every(([key, accepted]) => accepted.includes(user[key]));
  }

  function fetchModuleQuestions() {
    supabase
      .from('questions')
      .select('id, module_id, question_text, answer_option, question_order')
      .eq('module_id', module_id)
      .order('question_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) return console.error('❌ Supabase error:', error);
        const formatted = data.map((q) => ({ ...q, answer_options: q.answer_option }));
        setQuestions(formatted);
      });
  }

  async function handleDemoSubmit() {
    await supabase.from('usersessions').insert({
      user_session_id: sessionId,
      demo_attributes: responses,
    });
    if (!matchesTargeting(responses, targetingRules)) {
      setShowEnd(true);
    } else {
      setUserExists(true);
      setShowDemoPrompt(false);
    }
  }

  async function handleSubmit() {
    if (!currentAnswer.trim()) return;

    const currentQuestion = questions[currentIndex];

    await supabase.from('ModuleResponses').insert([
      {
        module_id,
        question_order: currentIndex,
        question_text: currentQuestion.question_text,
        selected_answer: currentAnswer,
        user_session_id: sessionId,
        demo_attributes: responses,
      },
    ]);

    setSubmittedAnswers([...submittedAnswers, currentAnswer]);
    setCurrentAnswer('');

    if (currentIndex + 1 >= questions.length) {
      await supabase.from('ModuleResponses')
        .update({ completed: true })
        .eq('module_id', module_id)
        .eq('user_session_id', sessionId);

      await supabase.from('SurveyCompletions').insert({
        survey_id,
        module_id,
        user_session_id: sessionId,
        demo_attributes: responses,
      });

      setShowEnd(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  if (!sessionId || (sessionId && !userExists && !showDemoPrompt)) {
    return <p className="p-2 text-xs">Initializing session...</p>;
  }

  if (!questions.length && !showDemoPrompt && !showEnd) {
    return <p className="p-2 text-xs">Loading questions...</p>;
  }

  if (showEnd) {
    return (
      <div className="p-2 text-center text-lg">
        🎉 Thank you! <br />
        Now register to get paid at SurveySite.com
        <div className="mt-3">
          <button
            onClick={resetSession}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded"
          >
            🔁 Reset Session
          </button>
        </div>
      </div>
    );
  }

  if (showDemoPrompt && targetingFields?.length > 0) {
    const grouped = [];
    for (let i = 0; i < targetingFields.length; i += 2) {
      grouped.push(targetingFields.slice(i, i + 2));
    }

    const currentGroup = grouped[demoPageIndex] || [];

    return (
      <div className="p-4 text-sm">
        <div className="text-lg font-bold text-left mb-4">
          Make Money – Short Poll!
        </div>
        {currentGroup.map((field) => (
          <div key={field.field_name} className="mb-6">
            <div className="font-medium mb-2">{field.field_name}</div>
            {field.values.length > 5 ? (
              <select
                className="w-full border rounded p-1"
                value={responses[field.field_name] || ''}
                onChange={(e) =>
                  setResponses({ ...responses, [field.field_name]: e.target.value })
                }
              >
                <option value="" disabled>Select an option</option>
                {field.values.map((val) => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            ) : (
              field.values.map((val) => (
                <label key={val} className="flex items-center mb-2">
                  <input
                    type="radio"
                    name={field.field_name}
                    value={val}
                    checked={responses[field.field_name] === val}
                    onChange={() =>
                      setResponses({ ...responses, [field.field_name]: val })
                    }
                    className="form-radio h-4 w-4 text-blue-600 mr-2"
                  />
                  <span className="text-gray-800 text-sm">{val}</span>
                </label>
              ))
            )}
          </div>
        ))}
        {demoPageIndex < grouped.length - 1 ? (
          <button
            onClick={() => setDemoPageIndex(demoPageIndex + 1)}
            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-xs"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleDemoSubmit}
            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-xs"
          >
            Start Survey
          </button>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return <p className="p-2 text-xs">Loading current question...</p>;
  }

  return (
  <>
    <div style={{ ...creativeStyle, width: '320px', height: '600px', overflow: 'hidden' }}>


    {/* Inject optional HTML block from creativeVariants */}
    {creativeHtml && (
      <div dangerouslySetInnerHTML={{ __html: creativeHtml }} />
    )}

    {/* Main Content Box */}
    <div className="p-2 mx-auto text-xs border shadow">

      <button
        onClick={resetSession}
        className="mb-2 px-2 py-1 text-xs bg-red-500 text-white rounded"
      >
        🔁 Reset Session
      </button>

      {currentIndex === 0 && (
        <div className="text-lg font-bold text-left mb-2">
          Make Money – Short Poll!
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Text */}
      <div className="font-semibold text-lg mb-2 leading-snug break-words whitespace-normal">
        {currentQuestion.question_text}
      </div>

      {/* Answer Options */}
      <ul className="space-y-2">
        {(currentQuestion.answer_options || []).map((opt, i) => (
          <li key={i} className="flex items-center">
            <div className="w-5 flex justify-center">
              <input
                type="radio"
                name="answer"
                value={opt}
                checked={currentAnswer === opt}
                onChange={() => setCurrentAnswer(opt)}
              />
            </div>
            <span className="ml-2">{opt}</span>
          </li>
        ))}
      </ul>

      {/* Submit Button */}
      <button
        className="mt-3 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Submit
               </button>
                </div> {/* close inner .p-2 box */}
      </div> {/* close outer wrapper */}
    </>
  );
}

EmbeddedModule.getLayout = function PageLayout(page) {

  return page;
};
