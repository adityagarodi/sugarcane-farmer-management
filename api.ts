import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors({
  origin: 'http://localhost:4200'
}));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    message: 'Sugarcane API is running'
  });
});

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;

  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({
      error: 'Please enter a question.'
    });
    return;
  }

  try {
    // We will connect this endpoint to your MCP client next.
    res.json({
      answer: 'Backend received your question: ' + question
    });
  } catch (error) {
    console.error('API error:', error);

    res.status(500).json({
      error: 'Unable to process your question.'
    });
  }
});

app.listen(3000, () => {
  console.log('API running at http://localhost:3000');
});