// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// app.post('/api/messages', async (req, res) => {
//   try {
//     const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
//         'HTTP-Referer': 'http://localhost:5173',
//         'X-Title': 'Lishe AI v2'
//       },
//       body: JSON.stringify(req.body),
//     });
//     const data = await response.json();
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ error: { message: error.message } });
//   }
// });

// app.listen(3001, () => console.log('✅ Lishe proxy running on http://localhost:3001'));

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/messages', async (req, res) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Lishe AI v2'
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

app.listen(3001, () => console.log('✅ Lishe proxy running on http://localhost:3001'));