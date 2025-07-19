import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function IFrameGeneration() {
  const [surveys, setSurveys] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedCreative, setSelectedCreative] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [questionHtml, setQuestionHtml] = useState('');

  const iframeRef = useRef(null);

  useEffect(() => {
    loadSurveys();
    loadCreatives();
  }, []);

  async function loadSurveys() {
    const { data, error } = await supabase.from('Surveys').select('id, title');
    if (error) console.error(error);
    else setSurveys(data);
  }

  async function loadCreatives() {
    const { data, error } = await supabase
      .from('creativevariants')
      .select('id, name, html_code, css_code');
    if (error) console.error(error);
    else setCreatives(data);
  }

  async function loadFirstQuestion(surveyId) {
  const { data: modules } = await supabase
    .from('questions')
    .select('survey_id, question_text, answer_option')
    .eq('survey_id', surveyId)
    .order('question_order')
    .limit(1);

  if (modules?.length > 0) {
    const q = modules[0];
    const opts = q.answer_option || [];

  const html = `
  <div class="question-block">
    <div class="question-text">${q.question_text}</div>
    <div class="answer-options">
      ${opts
        .map(
          (opt) => `
          <label class="answer-option">
            <input type="radio" name="answer" value="${opt}" />
            <span>${opt}</span>
          </label>
        `
        )
        .join('')}
    </div>
  </div>
`;

    return html;
  }

  return '';
}

async function handleGenerate() {
  const creative = creatives.find((c) => c.id === selectedCreative);
  if (!creative || !selectedSurvey) return;

  console.log("Selected Creative:", creative);
const replacedHtml = creative.html_code.replace('{{SURVEY_BLOCK}}', '<div id="survey-block"></div>');
console.log("Replaced HTML:", replacedHtml);
  console.log("CSS:", creative.css_code);

  const qHtml = await loadFirstQuestion(selectedSurvey);
const finalHtml = creative.html_code.replace('{{SURVEY_BLOCK}}', '<div id="survey-block"></div>');

setHtml(finalHtml);
setCss(creative.css_code);
setQuestionHtml(qHtml);  // <-- this was missing!


  const finalCss = `${creative.css_code}

.question-block {
  text-align: left;
  padding: 12px;
}

.question-text {
  font-weight: bold;
  margin-bottom: 10px;
}

.answer-option {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 16px;
  gap: 8px;
}
.answer-option input {
  margin: 0;
}
`;
setCss(finalCss);

  setQuestionHtml(qHtml); // optional, for debugging

  setTimeout(() => sendToIframe(), 100); // small delay ensures iframe is ready
}


  function sendToIframe() {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow || !html || !css) return;
    iframeWindow.postMessage({ html, css, questionHtml }, '*');
  }

  function handleIframeReady(event) {
  if (event.data?.type === 'iframe-ready') {
    console.log('✅ iframe is ready');
    sendToIframe();
  }
}


  useEffect(() => {
    window.addEventListener('message', handleIframeReady);
    return () => window.removeEventListener('message', handleIframeReady);
  }, [html, css, questionHtml]);

   useEffect(() => {
  if (selectedSurvey && selectedCreative) {
    handleGenerate();
  }
}, [selectedSurvey, selectedCreative]);


    return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold mb-4">🧪 iFrame Test Generator</h1>

      <div className="space-y-3">
        <div>
          <label className="block font-medium">Select Survey</label>
          <select
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="">-- Choose a survey --</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Select Creative Style</label>
          <select
            value={selectedCreative}
            onChange={(e) => setSelectedCreative(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="">-- Choose a creative style --</option>
            {creatives.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

 
      </div>

      {html && css && (
        <div className="mt-6 border rounded shadow">
          <iframe
            ref={iframeRef}
            src="/preview.html"
            width="340"
            height="600"
            style={{ border: '1px solid #ccc' }}
            title="Styled Survey Preview"
          ></iframe>
        </div>
      )}
    </div>
  );
}
