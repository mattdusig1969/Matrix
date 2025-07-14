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
  const module_id = router.query?.module_id;
  const survey_id = router.query?.survey_id;

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

  function resetSession() {
    localStorage.removeItem('user_session_id');
    window.location.reload(); // preserve all query params
  }

  useEffect(() => {
    const existingSession = localStorage.getItem('user_session_id');
    const id = existingSession || uuidv4();
    setSessionId(id);
    if (!existingSession) localStorage.setItem('user_session_id', id);
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
        .select('targeting')
        .eq('id', survey_id)
        .maybeSingle();

      const targeting = surveyData?.targeting || {};
      const fields = Object.entries(targeting).map(([field_name, values]) => ({
        field_name,
        values,
      }));
      setTargetingFields(fields);

      const isSimulated = window.location.search.includes('simulate=true');
      if (isSimulated) {
        const demo = {};
        fields.forEach(({ field_name, values }) => {
          const random = values[Math.floor(Math.random() * values.length)];
          demo[field_name] = random;
        });

        await supabase.from('usersessions').insert({
          user_session_id: sessionId,
          demo_attributes: demo,
        });

        setResponses(demo);
        setUserExists(true);
      } else {
        setShowDemoPrompt(true);
      }
    }
  }

  async function fetchModuleQuestions() {
    if (!module_id) return;

    console.log('📥 Fetching questions using module_id:', module_id);
    const { data, error } = await supabase
      .from('questions')
      .select('id, module_id, question_text, answer_option, question_order')
      .eq('module_id', module_id)
      .order('question_order', { ascending: true });

    if (error) {
      console.error('❌ Supabase error loading questions:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No questions returned. Check module_id matches.');
      return;
    }

    const formatted = data.map((q) => ({
      ...q,
      answer_options: q.answer_option,
    }));

    setQuestions(formatted);
    console.log(`✅ Loaded ${formatted.length} questions for module ${module_id}`);
  }

  async function handleDemoSubmit() {
    await supabase.from('usersessions').insert({
      user_session_id: sessionId,
      demo_attributes: responses,
    });
    setUserExists(true);
    setShowDemoPrompt(false);
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

    const updated = [...submittedAnswers, currentAnswer];
    setSubmittedAnswers(updated);
    setCurrentAnswer('');

    if (currentIndex + 1 >= questions.length) {
      await supabase
        .from('ModuleResponses')
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

  // ✨ DEFENSIVE UI RENDERING
  if (!sessionId || (!userExists && !showDemoPrompt)) {
    return <p className="p-2 text-xs">Initializing session...</p>;
  }

  if (showDemoPrompt && targetingFields?.length > 0) {
    return (
      <div className="p-4 text-sm">
        <h2 className="text-lg font-bold mb-2">Before we begin...</h2>
        {targetingFields.map((field) => (
          <div key={field.field_name} className="mb-4">
            <div className="font-medium mb-1">{field.field_name}</div>
            {field.values.map((val) => (
              <label key={val} className="block mb-1">
                <input
                  type="radio"
                  name={field.field_name}
                  value={val}
                  checked={responses[field.field_name] === val}
                  onChange={() =>
                    setResponses({ ...responses, [field.field_name]: val })
                  }
                  className="mr-2"
                />
                {val}
              </label>
            ))}
          </div>
        ))}
        <button
          onClick={handleDemoSubmit}
          className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-xs"
        >
          Start Survey
        </button>
      </div>
    );
  }

  if (!questions.length) {
    return <p className="p-2 text-xs">Loading questions...</p>;
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return <p className="p-2 text-xs">Loading current question...</p>;
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

  return (
    <div
      className="p-2 mx-auto text-xs border shadow"
      style={{ width: '320px', height: '600px', overflow: 'hidden' }}
    >
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

      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
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
                onChange={() => setCurrentAnswer(opt)}
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
