import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';


const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function EmbeddedModule() {
  const router = useRouter();
  const module_id = router.query?.module_id;
  const survey_id = router.query?.survey_id;
  const creative_id = router.query?.creative_id;

  // 🎨 Creative block
  const [creativeHtml, setCreativeHtml] = useState('');
  const iframeRef = useRef(null);
  const [creativeStyle, setCreativeStyle] = useState('');

  // 👤 User session and targeting
  const [sessionId, setSessionId] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [responses, setResponses] = useState({});
  const [targetingFields, setTargetingFields] = useState([]);
  const [targetingRules, setTargetingRules] = useState({});
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [demoPageIndex, setDemoPageIndex] = useState(0);

  // ❓ Survey questions
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submittedAnswers, setSubmittedAnswers] = useState([]);

  // ✅ Survey completion
  const [showEnd, setShowEnd] = useState(false);


  const currentQuestion = questions[currentIndex];  // ✅ Place it here


  function resetSession() { 
    localStorage.removeItem('user_session_id');
    window.location.reload();
  }

useEffect(() => {
  function handleIframeReady(event) {
    if (event.data?.type === 'iframe-ready') {
      console.log('✅ iframe is ready, sending creative content...');
      sendCreativeToIframe();
    }
  }

  function sendCreativeToIframe() {
    if (
      iframeRef.current?.contentWindow &&
      creativeHtml &&
      creativeStyle &&
      currentQuestion
    ) {
      const questionHtml = `
        <div style="font-weight:bold; margin-bottom:8px;">${currentQuestion.question_text}</div>
        <ul style="list-style:none; padding:0;">
          ${(currentQuestion.answer_options || [])
            .map(
              (opt) => `
            <li style="margin-bottom:6px;">
              <label>
                <input type="radio" name="answer" value="${opt}" style="margin-right:6px;" />
                ${opt}
              </label>
            </li>
          `
            )
            .join('')}
        </ul>
        <button style="margin-top:10px;padding:5px 10px;background:#007bff;color:#fff;border:none;border-radius:4px;">
          Submit
        </button>
      `;

      iframeRef.current.contentWindow.postMessage(
        { html: creativeHtml, css: creativeStyle, questionHtml },
        '*'
      );
    }
  }

  window.addEventListener('message', handleIframeReady);

  return () => {
    window.removeEventListener('message', handleIframeReady);
  };
}, [creativeHtml, creativeStyle, currentQuestion]);



useEffect(() => {
  if (!creative_id) {
    console.warn('⚠️ No creative_id provided in query string');
    return;
  }

  console.log('📦 Fetching creative_id:', creative_id);

  const fetchCreativeData = async () => {
    const { data, error } = await supabase
      .from('creativevariants')
      .select('html_code, css_code')
      .eq('id', creative_id?.toString())
      .single();

    if (error) {
      console.error('❌ Error loading creative style:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setCreativeStyle('');
      setCreativeHtml('');
      return;
    }

    if (!data) {
      console.error('❌ No data returned for creativevariant');
      return;
    }

    console.log('✅ Fetched Creative HTML:', data.html_code);
    console.log('✅ Fetched Creative CSS:', data.css_code);

    if (!data?.html_code || !data?.css_code) {
  console.warn("⚠️ Creative fetched but missing content:", data);
}
    setCreativeStyle(data.css_code || '');
    const htmlWithPlaceholder = (data.html_code || '').replace(
  '{{SURVEY_BLOCK}}',
  '<div id="survey-block"></div>'
);
setCreativeHtml(htmlWithPlaceholder);

  };

  fetchCreativeData();
}, [creative_id]);

useEffect(() => {
  const container = document.getElementById('survey-block');
  if (!container || !currentQuestion) return;

  container.innerHTML = ''; // Clear it first

  const questionEl = document.createElement('div');
  questionEl.className = 'font-semibold text-lg mb-2';
  questionEl.textContent = currentQuestion.question_text;

  const ul = document.createElement('ul');
  ul.className = 'space-y-2';

  (currentQuestion.answer_options || []).forEach((opt) => {
    const li = document.createElement('li');
    li.className = 'flex items-center';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.value = opt;
    input.checked = currentAnswer === opt;
    input.onclick = () => setCurrentAnswer(opt);
    input.className = 'mr-2';

    const span = document.createElement('span');
    span.textContent = opt;

    li.appendChild(input);
    li.appendChild(span);
    ul.appendChild(li);
  });

  const button = document.createElement('button');
  button.className = 'mt-3 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700';
  button.textContent = 'Submit';
  button.onclick = handleSubmit;

  container.appendChild(questionEl);
  container.appendChild(ul);
  container.appendChild(button);
}, [currentQuestion, currentAnswer]);


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

return (
  <>
    <div style={{ width: '320px', height: '600px', overflowY: 'auto', background: '#fff' }}>
      {/* 🧪 Optional Debug Panel */}
      <div style={{ padding: '5px', fontSize: '12px', background: '#eee', marginBottom: '10px' }}>
        <div><strong>Debug Panel</strong></div>
        <div>Iframe ref exists: {iframeRef.current ? '✅' : '❌'}</div>
        <div>HTML length: {creativeHtml?.length || 0}</div>
        <div>CSS length: {creativeStyle?.length || 0}</div>
      </div>

      {/* Debug: creative content info */}
      <div style={{ padding: '10px', background: '#ffe', fontSize: '12px' }}>
        <div><strong>Debug:</strong></div>
        <div>creativeHtml length: {creativeHtml?.length || 0}</div>
        <div>creativeStyle length: {creativeStyle?.length || 0}</div>
      </div>

      {/* Debug: current question info */}
      <div style={{ background: '#eef', fontSize: '12px', padding: '5px', marginBottom: '10px' }}>
        <strong>Debug Info:</strong><br />
        creativeHtml length: {creativeHtml?.length || 0}<br />
        currentQuestion: {currentQuestion?.question_text || 'none'}
      </div>

      {/* Inject creative CSS */}
      {creativeStyle && (
        <style dangerouslySetInnerHTML={{ __html: creativeStyle }} />
      )}

      {creativeHtml && creativeStyle && (
<iframe
  ref={iframeRef}
  title="Creative Preview"
  width="320"
  height="600"
  style={{ border: '1px solid #ccc' }}
  src="/preview.html"
/>



)}

    </div>
  </>
);
}

// ✅ Layout assignment must go AFTER the component's closing brace
EmbeddedModule.getLayout = function PageLayout(page) {
  return page;
};

const SESSION_COOKIE = 'survey_user_session';

// NEW: A map to explicitly link a targeting field to its correct attribute table.
const FIELD_TO_TABLE = {
  "Gender": "demoattributes",
  "Age Range": "demoattributes",
  "Ethnicity": "demoattributes",
  "Household Income": "demoattributes",
  "State": "geoattributes",
  "Region": "geoattributes",
};

// ... (generateQuestionHtml function remains the same) ...

export default function EmbeddedModule() {
  const router = useRouter();
  const { survey_id, module_id, creative_id } = router.query;
  const [sessionId, setSessionId] = useState(null);
  const [creativeHtml, setCreativeHtml] = useState('');
  const [creativeStyle, setCreativeStyle] = useState('');
  const [flowState, setFlowState] = useState('LOADING');
  const [message, setMessage] = useState('Initializing survey...');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [allAnswers, setAllAnswers] = useState({});
  const [assignedModuleId, setAssignedModuleId] = useState(null);
  const surveyTargetingRef = useRef({});
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // ... (useEffect for parent communication remains the same) ...

  // Main survey logic
  useEffect(() => {
    if (!router.isReady || !isSessionLoading) return;
    
    const startSurveyFlow = async () => {
      // ... (session handling logic remains the same) ...
    };

    startSurveyFlow();
  }, [router.isReady, survey_id, creative_id, module_id, isSessionLoading]);
  
  const doesUserQualify = (userProfile, surveyTargeting) => {
    // ... function remains the same ...
  };
  
  // MODIFIED: This function now uses the FIELD_TO_TABLE map
  const runTargeting = async (sid, survey, userProfile) => {
    const surveyTargeting = survey.targeting || {};
    const questionPromises = [];

    for (const fieldName in surveyTargeting) {
        const needsToAsk = !userProfile || !userProfile.demo_attributes?.[fieldName] && !userProfile.geo_attributes?.[fieldName] && !userProfile.psycho_attributes?.[fieldName];
        
        if (needsToAsk) {
            const table = FIELD_TO_TABLE[fieldName];
            if (!table) {
                console.warn(`No table mapping found for targeting field: ${fieldName}`);
                continue;
            }

            // Determine profile key based on table
            const profileKey = `${table.replace('attributes', '')}_attributes`;

            questionPromises.push(
                (async () => {
                    const { data: qRow } = await supabase.from(table).select('questiontext').eq('field_name', fieldName).not('questiontext', 'is', null).limit(1).single();
                    if (!qRow) return null;
                    const { data: optsData } = await supabase.from(table).select('value').eq('field_name', fieldName);
                    if (!optsData) return null;
                    const uniqueOptions = [...new Set(optsData.map(o => o.value))].sort();
                    return { id: fieldName, question_text: qRow.questiontext, answer_option: uniqueOptions, isTargeting: true, category: profileKey };
                })()
            );
        }
    }
    const resolvedQuestions = (await Promise.all(questionPromises)).filter(Boolean);
    if (resolvedQuestions.length === 0) {
        setFlowState('DISQUALIFIED');
        setMessage('Thank you for your interest, but you do not qualify for this survey.');
        return;
    }
    setQuestions(resolvedQuestions);
    setCurrentIndex(0);
    setAllAnswers({});
    setFlowState('TARGETING');
  };

  const runModuleAssignment = async (sid, current_survey_id, fallback_module_id) => {
    setFlowState('LOADING');
    setMessage('Finding the best questions for you...');
    let nextModuleId;
    const { data: modules, error: moduleError } = await supabase.from('Modules').select('id').eq('survey_id', current_survey_id);
    if (moduleError || !modules?.length) {
        if (fallback_module_id) nextModuleId = fallback_module_id;
        else throw new Error('No survey modules found.');
    } else {
        const moduleIds = modules.map(m => m.id);
        const { data: counts, error: countError } = await supabase.rpc('count_module_responses', { module_ids: moduleIds });
        if (countError) throw new Error('Could not calculate module distribution.');
        const countsMap = new Map(counts.map(c => [c.module_id, parseInt(c.response_count, 10)]));
        nextModuleId = moduleIds.reduce((prev, curr) => (countsMap.get(curr) || 0) < (countsMap.get(prev) || 0) ? curr : prev);
    }
    setAssignedModuleId(nextModuleId);
    const { data: moduleQuestions, error: qError } = await supabase.from('questions').select('*').eq('module_id', nextModuleId).order('question_order');
    if (qError || !moduleQuestions) throw new Error('Could not load survey questions.');
    setQuestions(moduleQuestions.map(q => ({ ...q, isTargeting: false })));
    setCurrentIndex(0);
    setAllAnswers({});
    setFlowState('MODULE');
  };
  
  const handleNextClick = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentAnswer) {
      alert('Please select an answer.');
      return;
    }
    const newAnswers = { ...allAnswers, [currentQuestion.id]: currentAnswer };
    setAllAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentAnswer(null);
      return;
    }

    if (flowState === 'TARGETING') {
      setFlowState('QUALIFYING');
      setMessage('Checking your answers...');
      const { data: existingProfile } = await supabase.from('usersessions').select('demo_attributes, geo_attributes, psycho_attributes').eq('user_session_id', sessionId).single();
      const profileUpdate = { demo_attributes: existingProfile?.demo_attributes || {}, geo_attributes: existingProfile?.geo_attributes || {}, psycho_attributes: existingProfile?.psycho_attributes || {} };
      questions.forEach(q => { if (q.isTargeting) profileUpdate[q.category][q.id] = newAnswers[q.id]; });
      const { data: updatedProfile, error: upsertError } = await supabase.from('usersessions').upsert({ user_session_id: sessionId, ...profileUpdate }).select().single();
      if (upsertError) throw new Error(`Could not save your profile: ${upsertError.message}`);
      
      if (doesUserQualify(updatedProfile, surveyTargetingRef.current)) {
        await runModuleAssignment(sessionId, survey_id, module_id);
      } else {
        setFlowState('DISQUALIFIED');
        setMessage('Thank you for your time. Unfortunately, you do not qualify for this survey.');
      }
    } else if (flowState === 'MODULE') {
      const responsesToSave = questions.map(q => ({ user_session_id: sessionId, module_id: assignedModuleId, question_order: q.question_order, question_text: q.question_text, selected_answer: newAnswers[q.id] || null, completed: true }));
      await supabase.from('ModuleResponses').insert(responsesToSave);
      setFlowState('COMPLETE');
      setMessage('Survey complete! Thank you for your responses.');
    }
  };

  useEffect(() => {
    window.handleRadioChange = (value) => setCurrentAnswer(value);
    return () => delete window.handleRadioChange;
  }, []);

  const handleNextClickCallback = useCallback(handleNextClick, [questions, currentIndex, currentAnswer, allAnswers, flowState, sessionId, survey_id, module_id, assignedModuleId]);

  useEffect(() => {
    const clickHandler = (event) => {
      event.preventDefault();
      handleNextClickCallback();
    };
    const button = document.getElementById('survey-next-btn');
    if (button) button.addEventListener('click', clickHandler);
    return () => {
      if (button) button.removeEventListener('click', clickHandler);
    };
  }, [handleNextClickCallback]);

  const renderContent = () => {
    switch (flowState) {
      case 'LOADING':
      case 'QUALIFYING':
        return `<p style="text-align: center; padding: 20px;">${message}</p>`;
      case 'ERROR':
      case 'DISQUALIFIED':
      case 'COMPLETE':
        return `<p style="text-align: center; padding: 20px; font-weight: bold;">${message}</p>`;
      case 'TARGETING':
      case 'MODULE':
        const currentQuestion = questions[currentIndex];
        if (!currentQuestion) return `<p style="text-align: center; padding: 20px;">Loading question...</p>`;
        const isLast = currentIndex === questions.length - 1;
        const buttonText = flowState === 'TARGETING' ? (isLast ? 'Check Eligibility' : 'Next') : (isLast ? 'Submit Survey' : 'Next');
        const questionHtml = generateQuestionHtml(currentQuestion, currentAnswer);
        const buttonHtml = `<button id="survey-next-btn" style="background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px; font-size: 16px;">${buttonText}</button>`;
        return `<div id="dynamic-content">${questionHtml}${buttonHtml}</div>`;
      default:
        return `<p>An unknown error occurred.</p>`;
    }
  };

  const finalHtmlContent = creativeHtml.replace(
    /\{\{SURVEY_BLOCK\}\}/g,
    `<div id="survey-block">${renderContent()}</div>`
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: creativeStyle }} />
      <div dangerouslySetInnerHTML={{ __html: finalHtmlContent }} />
    </>
  );
}

EmbeddedModule.getLayout = (page) => page;
