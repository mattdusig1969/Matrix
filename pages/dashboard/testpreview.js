// pages/dashboard/testpreview.js
import { useEffect, useState } from 'react';

export default function TestPreview() {
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [questionHtml, setQuestionHtml] = useState('');

  useEffect(() => {
    function handleMessage(event) {
      const { html, css, questionHtml } = event.data || {};
      if (html && css) {
        setHtml(html);
        setCss(css);
        setQuestionHtml(questionHtml);

        // Notify parent that iframe is ready to receive content
        window.parent.postMessage({ type: 'iframe-ready' }, '*');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (html && css && questionHtml) {
      const container = document.getElementById('creative-root');
      if (container) {
        container.innerHTML = html;

        // Append CSS style tag
        const styleTag = document.createElement('style');
        styleTag.textContent = css;
        document.head.appendChild(styleTag);

        // Replace placeholder with question
        const surveyBlock = container.querySelector('#survey-block');
        if (surveyBlock) {
          surveyBlock.innerHTML = questionHtml;
        }
      }
    }
  }, [html, css, questionHtml]);

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Test Preview</title>
      </head>
      <body style={{ margin: 0, fontFamily: 'Helvetica Neue, sans-serif' }}>
        <div id="creative-root"></div>
      </body>
    </html>
  );
}
