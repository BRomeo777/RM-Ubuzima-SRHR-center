import { usePersistentStore } from '../store';
import type { Language } from '../types';

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
  provider?: 'google' | 'groq';
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// System prompt for Ubuzima AI Assistant - Educational Resource
const UBUZIMA_SYSTEM_PROMPT = `You are Ubuzima, a Public Health Education Assistant for RM Ubuzima in Rwanda.

Your Role: Provide general health education and help users navigate platform resources. You are NOT a healthcare provider.

Guidelines:
• Share evidence-based, publicly available health information only
• Include in every response: "This is educational information only. Consult a licensed healthcare professional for personal medical advice."
• For medical concerns, direct users to qualified healthcare providers—not your own advice
• For emergencies, immediately tell users to call emergency services
• Never diagnose, prescribe, or recommend treatments
• Never provide crisis intervention or therapy
• Frame content as "educational resources," not "medical advice"
• Remind users not to share personal medical information in this chat

Your Purpose: Help users learn about health topics and connect with appropriate professional resources. You facilitate education and navigation—not medical care.`;

// Google Gemini API call
async function callGoogleGemini(
  apiKey: string,
  messages: ChatMessage[],
  language: Language
): Promise<AIResponse> {
  try {
    const model = 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Google API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!content) {
      throw new Error('No content generated from Google API');
    }

    return {
      content,
      success: true,
      provider: 'google',
    };
  } catch (error) {
    console.error('Google Gemini API error:', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Google API error',
      provider: 'google',
    };
  }
}

// Groq API call (Llama models)
async function callGroqAPI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  language: Language
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.1-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No content generated from Groq API');
    }

    return {
      content,
      success: true,
      provider: 'groq',
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Groq API error',
      provider: 'groq',
    };
  }
}

// Main function to query Ubuzima AI
export async function queryUbuzimaAI(
  userMessage: string,
  language: Language = 'en',
  chatHistory: ChatMessage[] = []
): Promise<AIResponse> {
  const { googleApiKey, groqApiKey, groqModel } = usePersistentStore.getState();

  const messages: ChatMessage[] = [
    { role: 'system', content: UBUZIMA_SYSTEM_PROMPT },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ];

  // Try Google Gemini first if available
  if (googleApiKey) {
    const googleResponse = await callGoogleGemini(googleApiKey, messages, language);
    if (googleResponse.success) {
      return googleResponse;
    }
    console.log('Google API failed, falling back to Groq:', googleResponse.error);
  }

  // Fallback to Groq (Llama) if available
  if (groqApiKey) {
    const groqResponse = await callGroqAPI(groqApiKey, groqModel, messages, language);
    if (groqResponse.success) {
      return groqResponse;
    }
    console.log('Groq API failed:', groqResponse.error);
  }

  // If both APIs fail, return error with helpful message
  return {
    content: '',
    success: false,
    error: 'AI service unavailable. Please configure API keys in Admin Panel (Google Gemini or Groq API).',
  };
}

// Generate smart suggestions based on user intent
export async function generateSmartSuggestions(
  context: string,
  language: Language = 'en'
): Promise<string[]> {
  const suggestions: Record<Language, string[]> = {
    en: [
      'Find nearby health facilities',
      'What are common contraception methods?',
      'How can I access HIV testing?',
      'Mental health support resources',
      'Addiction recovery programs',
    ],
    rw: [
      'Shaka ibigo nderabuzima hafi',
      'Ni uwuhe uburyo bwo kwirinda inda?',
      'Nigute nabona ikizamini cya Virusitike SIDA?',
      'Ubufasha mu buzima bwo mu mutwe',
      'Gukura mu ngeso mbi',
    ],
    fr: [
      'Trouver des centres de santé proches',
      'Quelles sont les méthodes de contraception?',
      'Comment accéder au dépistage du VIH?',
      'Ressources de santé mentale',
      'Programmes de récupération',
    ],
    sw: [
      'Tafuta vituo vya afya karibu',
      'Njia zipi za uzazi wa mpango zinapatikana?',
      'Ninawezaje kupima VVU?',
      'Rasilimali za afya ya akili',
      'Programu za kurekebishwa',
    ],
  };

  return suggestions[language] || suggestions.en;
}

// RM Admin AI System Prompt - STRICTLY Navigation Guide ONLY
function getRMAdminSystemPrompt(appFeatures: AppFeatures): string {
  return `You are RM Admin, a Platform Navigation Guide for RM Ubuzima.

STRICT BOUNDARY: You ONLY help with app navigation and feature locations. You do NOT discuss health, medical, or wellness topics.

Your Role: Guide users to the right sections of the app. You are NOT a healthcare provider and you do NOT provide health information.

Guidelines:
• If asked about health/medical topics, direct users to: SRHR Info section, Book SRHR Healthcare Provider, or Emergency contacts
• If asked about platform features, explain where to find them
• For emergencies, immediately direct to the Emergency section or tell them to call emergency services
• NEVER provide health information, medical advice, or wellness tips
• NEVER discuss health topics yourself—always redirect to appropriate resources
• Include: "I can help you navigate the app. For health questions, please check the SRHR Info section."

Navigation Guide:
• Health Education → SRHR Info section
• Weekly Sessions → Baza Muganga (Friday 7PM)
• Book Appointment → Services > Book SRHR Healthcare Provider
• Find Facilities → Services > Find Health Services
• Emergency Help → Emergency section (immediate assistance)
• Chat with Community → Community Chat
• Private Messages → Inbox
• Daily Updates → Home > Daily Feed

Your Purpose: Help users find their way around the app. You are a navigator, not an information source.`;
}

export interface AppFeatures {
  bazaMugangaTopic: string;
  bazaMugangaLink: string;
  bookDoctorEmail: string;
  facilitiesCount: number;
  articlesCount: number;
  topicsCount: number;
}

// Query RM Admin AI with app context
export async function queryRMAdminAI(
  userMessage: string,
  language: Language = 'en',
  chatHistory: ChatMessage[] = [],
  appFeatures?: Partial<AppFeatures>
): Promise<AIResponse> {
  const { googleApiKey, groqApiKey, groqModel, bazaMugangaTopic, bazaMugangaLink, bookDoctorEmail } = usePersistentStore.getState();

  const features: AppFeatures = {
    bazaMugangaTopic: appFeatures?.bazaMugangaTopic || bazaMugangaTopic || 'General SRHR Discussion',
    bazaMugangaLink: appFeatures?.bazaMugangaLink || bazaMugangaLink || 'https://meet.jit.si/rm-ubuzima-baza-muganga',
    bookDoctorEmail: appFeatures?.bookDoctorEmail || bookDoctorEmail || '',
    facilitiesCount: appFeatures?.facilitiesCount || 0,
    articlesCount: appFeatures?.articlesCount || 0,
    topicsCount: appFeatures?.topicsCount || 0,
  };

  const systemPrompt = getRMAdminSystemPrompt(features);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ];

  // Try Google Gemini first if available
  if (googleApiKey) {
    const googleResponse = await callGoogleGemini(googleApiKey, messages, language);
    if (googleResponse.success) {
      return googleResponse;
    }
    console.log('Google API failed, falling back to Groq:', googleResponse.error);
  }

  // Fallback to Groq (Llama) if available
  if (groqApiKey) {
    const groqResponse = await callGroqAPI(groqApiKey, groqModel, messages, language);
    if (groqResponse.success) {
      return groqResponse;
    }
    console.log('Groq API failed:', groqResponse.error);
  }

  // If both APIs fail, return error with helpful message
  return {
    content: '',
    success: false,
    error: 'AI service unavailable. Please configure API keys in Admin Panel (Google Gemini or Groq API).',
  };
}

// Check if AI service is configured
export function isAIConfigured(): boolean {
  const { googleApiKey, groqApiKey } = usePersistentStore.getState();
  return !!(googleApiKey || groqApiKey);
}

// Get AI provider status
export function getAIProviderStatus(): { google: boolean; groq: boolean } {
  const { googleApiKey, groqApiKey } = usePersistentStore.getState();
  return {
    google: !!googleApiKey,
    groq: !!groqApiKey,
  };
}
