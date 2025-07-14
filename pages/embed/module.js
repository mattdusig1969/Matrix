import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);


export default function EmbeddedModule() {
  const router = useRouter();
  const { module_id, survey_id, age, gender, creative_id } = router.query;

  const [creativeHTML, setCreativeHTML] = useState(null);
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

  useEffect(() => {
    const fetchCreative = async (newCreativeId) => {
      const id = newCreativeId || creative_id;
      if (!id) return;

      const { data, error } = await supabase
        .from('CreativeVariants')
        .select('html_code, css_code')
        .eq('id', id)
        .single();

      if (error || !data) return;

      // Remove previously injected styles
      document.querySelectorAll('style[data-injected-creative-style]').forEach(el => el.remove());

      // Inject CSS
      const styleTag = document.createElement('style');
      styleTag.setAttribute('data-injected-creative-style', 'true');
      styleTag.innerHTML = data.css_code;
      document.head.appendChild(styleTag);

      setCreativeHTML(data.html_code);
    };

    fetchCreative();

    const handleMessage = (event) => {
      if (event.data.type === 'update-creative') {
        fetchCreative(event.data.creativeId);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
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
    const { data: existingUser } = await supabase
      .from('usersessions')
      .select('*')
      .eq('user_session_id', sessionId)
      .maybeSingle();

      if (existingUser) {
  setUserExists(true);
console.log("✅ userExists set to true");
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
          if (["State", "Country"].includes(field_name)) sourceTable = 'geoattributes';
          if (["Values", "Lifestyle"].includes(field_name)) sourceTable = 'psychoattributes';

          const { data } = await supabase
            .from(sourceTable)
            .select('value')
            .eq('field_name', field_name)
            .eq('country_id', country_id);

          const values = data?.map(r => r.value).filter(Boolean) || [];
          return { field_name, values };
        })
      );

      setTargetingFields(allFields);

      const isSimulated = window.location.search.includes('simulate=true');
      if (isSimulated) {
        const sim = {};
        allFields.forEach(({ field_name, values }) => {
          sim[field_name] = values[Math.floor(Math.random() * values.length)];
        });
        await supabase.from('usersessions').insert({ user_session_id: sessionId, demo_attributes: sim });
        setResponses(sim);
        setUserExists(matchesTargeting(sim, targeting));
        if (!matchesTargeting(sim, targeting)) setShowEnd(true);
      } else {
        setShowDemoPrompt(true);
      }
    }
  }

  function matchesTargeting(user, targeting) {
    return Object.entries(targeting).every(([key, accepted]) => accepted.includes(user[key]));
  }

  async function fetchModuleQuestions() {
  const { data, error } = await supabase
  .from('questions')
  .select('id, module_id, question_text, answer_option, question_order')
  .eq('module_id', module_id)
  .order('question_order', { ascending: true })
  .then(({ data, error }) => {
    if (error) {
      console.error("❌ Failed to load questions:", error);
    } else {
      console.log("✅ Loaded questions:", data);
      const formatted = data.map((q) => ({ ...q, answer_options: q.answer_option }));
      setQuestions(formatted);
    }
  });


  if (error) {
    console.error("❌ Error loading questions:", error);
    return;
  }

  console.log("✅ Loaded questions:", data);
  const formatted = data.map((q) => ({ ...q, answer_options: q.answer_option }));
  setQuestions(formatted);
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
    console.log("Selected answer:", currentAnswer);
    console.log("✅ Submitting answer for:", questions[currentIndex]);
    console.log("Current question list:", questions);
    console.log("🔘 Current selected answer:", currentAnswer);
    if (!currentAnswer.trim()) return;
    const currentQuestion = questions[currentIndex];

    await supabase.from('ModuleResponses').insert({
      module_id,
      question_order: currentIndex,
      question_text: currentQuestion.question_text,
      selected_answer: currentAnswer,
      user_session_id: sessionId,
      demo_attributes: responses,
    });

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

  if (!sessionId || (!userExists && !showDemoPrompt)) {
    return <p className="p-2 text-xs">Initializing session...</p>;
  }

  if (!questions.length && !showDemoPrompt && !showEnd) {
    return <p className="p-2 text-xs">Loading questions...</p>;
  }

  if (showEnd) {
    return (
      <div className="p-4 text-sm">
              <p className="text-center text-green-700 font-bold">
          ✅ Thank you for your response!
        </p>
        <button onClick={resetSession} className="mt-4 text-xs text-blue-600 underline">
          Start Over
        </button>
      </div>
    );
  }

  if (showDemoPrompt && targetingFields.length > 0) {
  const grouped = [];
  for (let i = 0; i < targetingFields.length; i += 2) {
    grouped.push(targetingFields.slice(i, i + 2));
  }
  const currentGroup = grouped[demoPageIndex] || [];

  return (
    <div className="p-4 text-sm">
      {creativeHTML && (
  <div
    key={creative_id}
    style={{
      position: 'relative',
      zIndex: 0,
      marginBottom: '12px'
    }}
    dangerouslySetInnerHTML={{ __html: creativeHTML }}
  />
)}


      <div className="text-lg font-bold text-left mb-4">
        Make Money – Short Poll!
      </div>

      {currentGroup.map((field) => (
        <div key={field.field_name} className="mb-6">
          <div className="font-medium mb-2">{field.field_name}</div>
          {field.values.

  
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
                    name={`demo_${field.field_name}`}
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
  if (!currentQuestion) return <p className="p-2 text-xs">Loading current question...</p>;

  return (
  <div className="p-2 mx-auto text-xs border shadow relative z-10"
  style={{ width: '320px', height: '600px', overflow: 'auto' }}>

    {/* ✅ VISUAL HEADER ONLY — NOT INTERACTIVE */}
    {creativeHTML && (
  <div
    key={creative_id}
    style={{
      position: 'relative',
      zIndex: 0,
      marginBottom: '12px'
    }}
    dangerouslySetInnerHTML={{ __html: creativeHTML }}
  />
)}


    <button
      onClick={resetSession}
      className="mb-2 px-2 py-1 text-xs bg-red-500 text-white rounded"
    >
      🔁 Reset Session
    </button>

    <div className="text-lg font-bold text-left mb-2">
      Make Money – Short Poll!
    </div>

    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
      ></div>
    </div>


      <div className="font-semibold text-lg mb-2 leading-snug break-words whitespace-normal">
        {currentQuestion.question_text}
      </div>

      <ul className="space-y-2">
        {(currentQuestion.answer_options || []).map((opt, i) => (
          <li key={i} className="flex items-center">
            <div className="w-5 flex justify-center">
              <input
            type="radio"
            name="answer"
            value={opt}
            checked={currentAnswer === opt}
            onChange={() => {
              console.log("Clicked option:", opt);
              setCurrentAnswer(opt);
            }}
          />
            </div>
            <span className="ml-2">{opt}</span>
          </li>
        ))}
      </ul>

      <button
        className="mt-3 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Submit
      </button>
    </div>
  );
}

EmbeddedModule.getLayout = function PageLayout(page) {
  return page;
};
