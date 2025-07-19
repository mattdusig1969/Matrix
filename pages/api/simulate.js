// pages/api/simulate.js

export default async function handler(req, res) {
  // Ensure this is a POST request
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is missing in the request body.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
  }

  const payload = {
    model: "gpt-4o", // A powerful model suitable for this task
    messages: [
      {
        role: "system",
        content: "You are an AI expert in creating realistic user personas and simulating survey responses. Your goal is to generate diverse and believable answers based on a defined target audience. You must respond in the valid JSON format requested by the user."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }, // Enforce JSON output
    temperature: 0.8, // Add some creativity to the responses
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Forward the error from OpenAI's API
      return res.status(response.status).json(data);
    }

    // The actual response content is a JSON string inside the 'content' field
    const jsonResponse = JSON.parse(data.choices[0].message.content);

    // Send the parsed JSON object back to the front-end
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
}
