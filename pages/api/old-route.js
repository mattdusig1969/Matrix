// pages/api/route.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { demographics, questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      console.error("Missing or invalid questions array.");
      return res.status(400).json({ error: "Missing or invalid questions" });
    }

    const prompt = `
You are assisting with survey design using a matrix sampling approach.

The full survey is listed below, with each question followed by its possible answers. Your task is to split this longer survey into smaller modules. Each module should contain only 2–3 questions.

The goal is for each module to be answerable by a single respondent, based on the following demographic criteria:
- Gender(s): ${demographics.gender.join(", ")}
- Age Range(s): ${demographics.age.join(", ")}

**Instructions:**
- Return clear groupings labeled "Module 1", "Module 2", etc.
- Do not repeat questions across modules.
- Every question in the original survey must appear in exactly one module.
- Keep responses clean and text-based (no markdown, no code formatting).
- Your response will be parsed by software, so use simple line breaks and clear formatting.

**Survey Questions:**
${questions
  .map(
    (q, i) =>
      `${i + 1}. ${q.question_text}\nAnswers: ${q.answer_option?.join(", ") ?? "N/A"}`
  )
  .join("\n\n")}
`;


    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI API error", details: data });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No valid result returned from API:", data);
      return res.status(500).json({ error: "No valid result returned from API" });
    }

    return res.status(200).json({ modules: content });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
