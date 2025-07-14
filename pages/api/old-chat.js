// pages/api/chat.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set this in .env.local
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { message } = req.body;

 const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo", // ✅ Use this unless you’ve confirmed access to "gpt-4"
  messages: [
    { role: "system", content: "You are an expert survey designer." },
    { role: "user", content: prompt }
  ],
});


    res.status(200).json({ reply: chatCompletion.choices[0].message.content });
  } catch (err) {
    console.error('OpenAI API Error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
