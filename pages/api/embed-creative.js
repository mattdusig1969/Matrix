import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yyimqdffhozncrqjmpqh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aW1xZGZmaG96bmNycWptcHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Njc1OTksImV4cCI6MjA2NzU0MzU5OX0.IBLihUKFXvtvIUVA3C7bPoQHfiuQEEdmwgj930RRpFs'
);

// Helper function to generate HTML for a question
function generateQuestionHtml(question) {
  if (!question) {
    return '<div>No question available.</div>';
  }

  let optionsHtml = '';
  try {
    const options = typeof question.answer_option === 'string'
      ? JSON.parse(question.answer_option)
      : Array.isArray(question.answer_option)
      ? question.answer_option
      : [];

    if (options.length > 0) {
      optionsHtml = options.map((option, index) => `
        <label style="display: block; margin-bottom: 8px; cursor: pointer;">
          <input type="radio" name="answer_${question.id}" value="${option}" id="q${question.id}_opt${index}" style="margin-right: 5px;" />
          ${option}
        </label>
      `).join('');
    } else {
      optionsHtml = '<p>No answer options defined.</p>';
    }
  } catch (e) {
    console.error('Error parsing answer_option for question:', question.id, e);
    optionsHtml = '<p>Error loading options.</p>';
  }


  return `
    <div class="survey-question" data-question-id="${question.id}" style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px; background-color: #fff;">
      <p style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">${question.question_order}. ${question.question_text}</p>
      <div class="question-options">
        ${optionsHtml}
      </div>
    </div>
  `;
}


export default async function handler(req, res) {
  const { creative_id, survey_id, module_id } = req.query;

  // Ensure all necessary parameters are provided
  if (!creative_id || !survey_id || !module_id) {
    console.error('API: Missing query parameters. Required: creative_id, survey_id, module_id');
    return res.status(400).send('Missing creative_id, survey_id, or module_id');
  }

  try {
    // 1. Fetch Creative Data from 'creativevariants' table
    const { data: creativeData, error: creativeError } = await supabase
      .from('creativevariants')
      .select('html_code, css_code')
      .eq('id', creative_id)
      .single();

    if (creativeError || !creativeData) {
      console.error('API: Error fetching creative variant:', creativeError || 'No creative data found for ID:', creative_id);
      return res.status(404).send('Creative not found for the given ID');
    }

    let { html_code: creativeHtml, css_code: creativeStyle } = creativeData;
    // Provide a fallback if html_code or css_code are empty in DB
    creativeHtml = creativeHtml || '<div class="creative-content-fallback" style="text-align: center; padding: 20px; color: #555;">Your creative content will appear here.</div>';
    creativeStyle = creativeStyle || '';

    // Declare surveyQuestionsHtml here so it's always defined
    let surveyQuestionsHtml = ''; 

    // 2. Fetch Survey Questions for the specific module
    const { data: questions, error: questionsError } = await supabase
      .from('questions') // Table name to 'questions' (lowercase)
      .select('*')
      .eq('module_id', module_id)
      .order('question_order', { ascending: true });

    if (questionsError) {
      console.error('API: Error fetching questions for module:', module_id, questionsError);
      // If there's an error fetching questions, log it and set an error message
      surveyQuestionsHtml = '<p style="color: red; text-align: center;">Error loading survey questions.</p>';
    } else {
        if (questions && questions.length > 0) {
          // Generate HTML for each question
          surveyQuestionsHtml = questions.map(q => generateQuestionHtml(q)).join('');
        } else {
          surveyQuestionsHtml = '<p style="text-align: center; color: #777;">No questions found for this module.</p>';
        }
    }

    // DEBUG LOGS (will now print the actual values)
    console.log('DEBUG: creativeHtml content right before replace:', JSON.stringify(creativeHtml));
    console.log('DEBUG: surveyQuestionsHtml content right before replace:', JSON.stringify(surveyQuestionsHtml));

   const finalCreativeHtml = creativeHtml.replace(
  /\{\{SURVEY_BLOCK\}\}/g, // Regex to match {{SURVEY_BLOCK}} globally
  `<div id="survey-block" style="width: 100%; max-width: 350px; margin: 0 auto;">${surveyQuestionsHtml}</div>`
);

    // 3. Construct the full HTML response for the iframe
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ad Creative Preview</title>
          <style id="creative-style">${creativeStyle}</style>
          <style>
            /* Basic reset/base styles for the ad iframe */
            body { margin: 0; padding: 0; font-family: sans-serif; overflow-x: hidden; height: 100%; box-sizing: border-box; background-color: #f0f2f5; }
            html { height: 100%; box-sizing: border-box; }
            #ad-container {
              width: 100%;
              min-height: 100%;
              overflow-y: auto;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: center;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div id="ad-container">
            ${finalCreativeHtml}
          </div>

          <script>
            window.parent.postMessage({
              type: 'creative-loaded',
              module_id: '${module_id}',
              survey_id: '${survey_id}',
              creative_id: '${creative_id}'
            }, '*');

            const surveyBlock = document.getElementById('survey-block');
            if (surveyBlock && surveyBlock.innerHTML.includes('survey-question')) { // Check if questions were actually injected
                const submitButton = document.createElement('button');
                submitButton.textContent = 'Submit Survey';
                submitButton.style = 'background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px; margin-bottom: 20px; font-size: 16px;';
                submitButton.addEventListener('click', () => {
                    const answers = {};
                    document.querySelectorAll('.survey-question').forEach(qDiv => {
                        const qId = qDiv.dataset.questionId;
                        const selectedOption = qDiv.querySelector('input[type="radio"]:checked');
                        if (selectedOption) {
                            answers[qId] = selectedOption.value;
                        }
                    });
                    console.log('Collected Answers:', answers);
                    window.parent.postMessage({ type: 'survey-submitted', module_id: '${module_id}', answers: answers }, '*');
                    // alert('Survey Submitted! (Check parent console for answers)'); // Can be annoying, often remove for production
                });
                surveyBlock.appendChild(submitButton);
            }
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(fullHtml);

  } catch (error) {
    console.error('API: Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
}