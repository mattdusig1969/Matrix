// pages/dashboard/testgenerateadcode.js

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

export default function TestGenerateAdCode() {
  const [surveys, setSurveys] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedCreative, setSelectedCreative] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [questions, setQuestions] = useState([]);

  const iframeRef = useRef(null);

  useEffect(() => {
    async function fetchSurveys() {
      const { data } = await supabase.from('Surveys').select('id, title');
      setSurveys(data || []);
    }

    async function fetchCreatives() {
      const { data } = await supabase.from('creativevariants').select('id, name, html_code, css_code');
      setCreatives(data || []);
    }

    fetchSurveys();
    fetchCreatives();
  }, []);

  useEffect(() => {
    if (selectedSurvey && selectedCreative) generateAdPreview();
  }, [selectedSurvey, selectedCreative]);

  async function generateAdPreview() {
    const creative = creatives.find((c) => c.id === selectedCreative);
    if (!creative) return;

    const { data: questionData } = await supabase
      .from('questions')
      .select('question_text, answer_option')
      .eq('survey_id', selectedSurvey)
      .order('question_order');

    setQuestions(questionData || []);

    const htmlWithPlaceholder = creative.html_code.replace('{{SURVEY_BLOCK}}', '<div id="survey-block"></div>');
    setHtml(htmlWithPlaceholder);
    setCss(creative.css_code);

    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          html: htmlWithPlaceholder,
          css: creative.css_code,
          questions: questionData,
        },
        '*'
      );
    }, 300);
  }

  function handleIframeReady(event) {
    if (event.data?.type === 'iframe-ready') {
      iframeRef.current?.contentWindow?.postMessage(
        { html, css, questions },
        '*'
      );
    }
  }

  useEffect(() => {
    window.addEventListener('message', handleIframeReady);
    return () => window.removeEventListener('message', handleIframeReady);
  }, [html, css, questions]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🚀 Styled Ad Code Preview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="font-semibold block mb-1">Survey</label>
          <select
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">-- Select Survey --</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold block mb-1">Creative Style</label>
          <select
            value={selectedCreative}
            onChange={(e) => setSelectedCreative(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">-- Select Style --</option>
            {creatives.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded shadow p-3">
        <iframe
          ref={iframeRef}
          src="/testpreview.html"
          width="360"
          height="600"
          style={{ border: '1px solid #ccc' }}
          title="Ad Style Preview"
        ></iframe>
      </div>
    </div>
  );
}
