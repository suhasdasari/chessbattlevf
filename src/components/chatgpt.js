// chatgpt.js

import axios from 'axios';

const CHATGPT_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
async function getCommentary(move) {
  try {
    const response = await axios.post(
      CHATGPT_API_ENDPOINT,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a chess commentator. Provide a brief, engaging commentary for the given chess move. should not exceed more than 10 words also make it funny.' },
          { role: 'user', content: `Provide commentary for this chess move: ${move}` }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error getting commentary:', error);
    return 'Commentary unavailable.';
  }
}

export { getCommentary };