import OpenAI from 'openai';

// Initialize the OpenAI client with your API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This helper can be removed if the AI handles keywords too, but we'll leave it for now.
const getKeywords = (texts) => {
    const stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);
    const wordCounts = {};
    texts.forEach(text => {
        text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/).forEach(word => {
            if (word && !stopWords.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
    });
    return Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([text, value]) => ({ text, value }));
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { answers } = req.body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  // Format the answers for the AI prompt
  const formattedAnswers = answers.map((answer, index) => `${index + 1}: "${answer}"`).join('\n');

  const prompt = `As a professional market research analyst, analyze the following list of open-ended survey responses. For each response, provide:
1.  A sentiment classification ('Positive', 'Negative', or 'Neutral').
2.  An array of 1-3 concise, insightful codes (keywords or short phrases) that categorize the core themes.

Responses:
${formattedAnswers}

Return your response as a single, valid JSON object with a single root key "analysis". The value of "analysis" should be an array of objects, where each object corresponds to an answer and contains "sentiment" and "codes" keys. Example:
{
  "analysis": [
    { "sentiment": "Positive", "codes": ["Scenery", "Relaxation"] },
    { "sentiment": "Neutral", "codes": ["Travel Gear", "Preparation"] }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a market research analyst who provides structured data in JSON format." },
            { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
    });

    const aiResponseContent = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(aiResponseContent);

    // Extract sentiments and codes from the AI response
    const analysisData = parsedResponse.analysis || [];
    const sentiments = analysisData.map(item => item.sentiment || 'Neutral');
    const codes = analysisData.map(item => item.codes || []);
    
    // We can still generate keywords using the old method
    const keywords = getKeywords(answers);

    res.status(200).json({ sentiments, keywords, codes });

  } catch (error) {
      console.error("AI analysis call failed:", error);
      res.status(500).json({ error: { message: 'Failed to get response from AI.' } });
  }
}