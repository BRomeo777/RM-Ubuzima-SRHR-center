const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { Groq } = require('groq-sdk');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

// AI configurations matching your app
const aiConfigs = {
  'dr-r': {
    name: 'Dr. R (Reproductive Health)',
    specialty: 'Reproductive Health & Family Planning',
    prompt: 'You are Dr. R, a compassionate reproductive health expert in Rwanda. Write a short, helpful post (max 150 words) about reproductive health, family planning, or sexual health for Rwandan youth. Use simple Kinyarwanda-English mix. Include one practical tip. Format: Title on first line, then content.'
  },
  'dr-m': {
    name: 'Dr. M (Maternal Health)',
    specialty: 'Maternal & Child Health',
    prompt: 'You are Dr. M, a maternal health specialist in Rwanda. Write a short, encouraging post (max 150 words) about pregnancy care, maternal health, or child nutrition for Rwandan mothers. Use simple Kinyarwanda-English mix. Include one practical tip. Format: Title on first line, then content.'
  },
  'dr-b': {
    name: 'Dr. B (Mental Health)',
    specialty: 'Mental Health & Counseling',
    prompt: 'You are Dr. B, a mental health counselor in Rwanda. Write a short, supportive post (max 150 words) about mental health, stress management, or emotional wellbeing for Rwandan youth. Use simple Kinyarwanda-English mix. Include one coping strategy. Format: Title on first line, then content.'
  },
  'did-you-know': {
    name: 'Did You Know?',
    specialty: 'SRHR Facts & Education',
    prompt: 'Share one surprising but accurate fact about sexual and reproductive health (max 100 words). Make it educational and engaging for Rwandan youth. Include a "Did you know?" opening. Use simple Kinyarwanda-English mix.'
  },
  'ubuzima-admin': {
    name: 'Ubuzima Admin',
    specialty: 'Platform Updates & News',
    prompt: 'Write a short platform update or announcement (max 100 words) for RM Ubuzima users. Share news about new features, tips for using the app, or community highlights. Friendly and informative tone.'
  }
};

// Generate AI post function
async function generateAIPost(aiType) {
  try {
    const config = aiConfigs[aiType];
    if (!config) {
      console.log(`Unknown AI type: ${aiType}`);
      return null;
    }

    console.log(`Generating post for ${config.name}...`);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: 'Generate a helpful post for today.' }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse title and content
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '').replace(/^Title:\s*/i, '').trim();
    const bodyContent = lines.slice(1).join('\n').trim();

    const post = {
      id: Date.now().toString(),
      title: title || `${config.name} Update`,
      content: bodyContent || content,
      author: config.name,
      aiType: aiType,
      specialty: config.specialty,
      timestamp: new Date().toISOString(),
      views: 0,
      likes: 0,
      isAIGenerated: true
    };

    console.log(`✅ Generated post: ${post.title}`);
    return post;

  } catch (error) {
    console.error(`❌ Error generating post for ${aiType}:`, error.message);
    return null;
  }
}

// API endpoint to generate AI post manually
app.post('/api/generate-post', async (req, res) => {
  const { aiType } = req.body;
  
  if (!aiType || !aiConfigs[aiType]) {
    return res.status(400).json({ error: 'Invalid AI type' });
  }

  const post = await generateAIPost(aiType);
  
  if (post) {
    res.json({ success: true, post });
  } else {
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

// API endpoint to trigger all AIs
app.post('/api/generate-all-posts', async (req, res) => {
  const results = {};
  
  for (const aiType of Object.keys(aiConfigs)) {
    const post = await generateAIPost(aiType);
    results[aiType] = post ? { success: true, title: post.title } : { success: false };
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  res.json({ success: true, results });
});

// Health check endpoint (for Uptime Robot)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'RM Ubuzima Backend Server',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /api/health',
      'POST /api/generate-post',
      'POST /api/generate-all-posts'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
