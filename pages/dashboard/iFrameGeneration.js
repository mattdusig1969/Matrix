import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function IFrameGeneration() {
  const [surveys, setSurveys] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedCreative, setSelectedCreative] = useState('');
  const iframeRef = useRef(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    fetchData();
    window.addEventListener('message', handleIframeMessages);
    return () => window.removeEventListener('message', handleIframeMessages);
  }, []);

  useEffect(() => {
    if (selectedSurvey && selectedCreative) {
      currentIndexRef.current = 0;
      renderStyledSurvey(0);
    }
  }, [selectedSurvey, selectedCreative]);

  async function fetchData() {
    const [surveysRes, creativesRes] = await Promise.all([
      supabase.from('Surveys').select('id, title'),
      supabase.from('creativevariants').select('id, name, html_code, css_code')
    ]);

    if (!surveysRes.error) setSurveys(surveysRes.data);
    if (!creativesRes.error) setCreatives(creativesRes.data);
  }

  function handleIframeMessages(event) {
    if (event.data?.type === 'iframe-ready') {
      renderStyledSurvey(currentIndexRef.current);
    }
    if (event.data?.type === 'next-question') {
      currentIndexRef.current += 1;
      renderStyledSurvey(currentIndexRef.current);
    }
  }

  async function renderStyledSurvey(currentIndex = 0) {
    const creative = creatives.find(c => c.id === selectedCreative);
    if (!creative) return;

    const { data: questions } = await supabase
      .from('questions')
      .select('question_text, answer_option')
      .eq('survey_id', selectedSurvey)
      .order('question_order');

    if (!questions || questions.length === 0 || currentIndex >= questions.length) return;

    const q = questions[currentIndex];
    const opts = q.answer_option || [];

    const questionHtml = `
      <div class="question-block">
        <div class="question-text">${q.question_text}</div>
        <div class="answer-options">
          ${opts
            .map(
              opt => `
                <label class="answer-option">
                  <input type="radio" name="answer" value="${opt}" />
                  <span>${opt}</span>
                </label>
              `
            )
            .join('')}
        </div>
        ${
          currentIndex < questions.length - 1
            ? `<button id="next-btn" class="next-button">Next</button>`
            : `<div class="end-text">🎉 Thank you for completing the survey!</div>`
        }
      </div>
    `;

    const styledHtml = creative.html_code.replace('{{SURVEY_BLOCK}}', `<div id="survey-block">${questionHtml}</div>`);
    const styledCss = `
      ${creative.css_code}
      .question-block { padding: 12px; text-align: left; }
      .question-text { font-weight: bold; margin-bottom: 10px; }
      .answer-option { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 15px; }
      .answer-option input { margin: 0; }
      .next-button {
        margin-top: 12px;
        background: #007bff;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
      }
    `;

    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'load-survey', html: styledHtml, css: styledCss, questionIndex: currentIndex },
        '*'
      );
    }, 100);
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">🧪 Styled Survey Preview</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block font-semibold">Select Survey</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
          >
            <option value="">-- Choose a survey --</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold">Select Creative Style</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedCreative}
            onChange={(e) => setSelectedCreative(e.target.value)}
          >
            <option value="">-- Choose a style --</option>
            {creatives.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 border rounded shadow">
        <iframe
          ref={iframeRef}
          src="/previewiframe.html"
          width="340"
          height="600"
          style={{ border: '1px solid #ccc' }}
          title="Styled Survey"
        ></iframe>
      </div>
    </div>
  );
}
