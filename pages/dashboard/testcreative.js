import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...'
);

export default function TestCreativePreview() {
  const iframeRef = useRef();
  const [creative, setCreative] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [questionHtml, setQuestionHtml] = useState('');
  const [finalHtml, setFinalHtml] = useState('');
  const [css, setCss] = useState('');

  useEffect(() => {
    loadData();
    window.addEventListener('message', handleIframeReady);
    return () => window.removeEventListener('message', handleIframeReady);
  }, []);

  async function loadData() {
    const { data: creatives } = await supabase
      .from('creativevariants')
      .select('*')
      .limit(1);
    const { data: surveys } = await supabase
      .from('Surveys')
      .select('id, title')
      .limit(1);
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('survey_id', surveys[0].id)
      .order('question_order');

    setCreative(creatives[0]);
    setSurvey(surveys[0]);

    const question = questions[0];
    const opts = Array.isArray(question.answer_option)
      ? question.answer_option
      : JSON.parse(question.answer_option || '[]');

    const qHtml = `
      <div style="font-weight:bold; margin-bottom:8px;">${question.question_text}</div>
      <ul style="list-style:none; padding:0;">
        ${opts
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
      <button id="next-btn" style="margin-top:10px;padding:5px 10px;background:#007bff;color:#fff;border:none;border-radius:4px;">
        Next
      </button>
    `;

    const htmlWithBlock = creatives[0].html_code.replace('{{SURVEY_BLOCK}}', `<div id="survey-block">${qHtml}</div>`);

    setFinalHtml(htmlWithBlock);
    setCss(creatives[0].css_code);
  }

  function handleIframeReady(e) {
    if (e.data?.type === 'iframe-ready') {
      iframeRef.current?.contentWindow.postMessage(
        { type: 'load-survey', html: finalHtml, css },
        '*'
      );
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold mb-4">🎨 Test Styled Creative</h1>
      <iframe
        ref={iframeRef}
        src="/preview.html"
        width="340"
        height="660"
        style={{ border: '1px solid #ccc' }}
        title="Styled Survey Preview"
      />
    </div>
  );
}
