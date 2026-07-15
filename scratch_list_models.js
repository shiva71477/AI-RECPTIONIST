const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const models = await genAI.listModels();
    console.log('Available models:');
    for (const m of models.models) {
      console.log(`- ${m.name}`);
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

run();
