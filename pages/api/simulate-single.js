// pages/api/simulate-single.js
import OpenAI from 'openai';

// Initialize the OpenAI client with your API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: { message: 'Prompt is required' } });
  }

  try {
    // Send the prompt to the OpenAI API and request a JSON response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Or another suitable model like "gpt-3.5-turbo"
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponseContent = completion.choices[0].message.content;

    // Parse the JSON string from the AI's response
    const parsedResponse = JSON.parse(aiResponseContent);

    // Return the parsed JSON object
    res.status(200).json(parsedResponse);

  } catch (error) {
    console.error("AI API call failed:", error);
    res.status(500).json({ error: { message: 'Failed to get response from AI.' } });
  }
}