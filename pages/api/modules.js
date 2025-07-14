// pages/api/modules.js

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { surveyId, questions, targeting } = req.body;

  console.log("📨 Received POST to /api/modules");
console.log("🧪 Incoming body:", req.body);
  console.log("📨 Incoming request to /api/modules");
  console.log("🧪 Survey ID:", surveyId);
  console.log("📋 Questions:", questions?.length);
  console.log("🎯 Targeting:", JSON.stringify(targeting, null, 2));

  if (!surveyId || !Array.isArray(questions) || questions.length === 0) {
    console.error("❌ Missing surveyId or questions");
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `
You are an expert in survey design using matrix sampling.

Given the full list of questions below, return a list of modules. Each module should contain only 2–3 questions and be designed to be answered by a single user.

Target Audience: 
- Genders: ${targeting?.gender?.join(", ") || "All"}
- Age Ranges: ${targeting?.age_ranges?.join(", ") || "All"}

Here are the questions:
${questions.map((q, i) => `Q${i + 1}: ${q.question_text}`).join("\n")}

Respond ONLY with JSON. Do not add any explanation or commentary.


Please return the output as clean JSON in this format:
{
  "modules": [
    {
      "title": "Module 1",
      "questions": ["Q1", "Q3", "Q5"]
    },
    ...
  ]
}
`;

  try {
    console.log("🤖 Sending prompt to OpenAI...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const message = response.choices?.[0]?.message?.content;

    console.log("✅ Raw GPT Response:");
    console.log(message);

   let parsed;
try {
  const match = message.match(/\{[\s\S]*\}/);
  parsed = JSON.parse(match?.[0] || "{}");
  console.log("✅ Parsed modules:", parsed.modules);
} catch (err) {
  console.error("❌ JSON parse failed:", err.message);
  return res.status(500).json({ error: "Failed to parse GPT output" });
}


    if (!parsed.modules) {
      throw new Error("No modules returned from GPT");
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error("❌ Error generating modules:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Failed to generate modules from GPT" });
  }
}
