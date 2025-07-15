import { parse } from 'css-what';

export default function handler(req, res) {
  const { css } = req.body;

  if (!css) {
    return res.status(400).json({ error: 'CSS is required' });
  }

  try {
    const parsed = parse(css);
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse CSS' });
  }
}
