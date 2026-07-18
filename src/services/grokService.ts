import type { AIType, PostLength, Language } from '../types';
import { usePersistentStore } from '../store';

interface GroqResponse {
  content: string;
  success: boolean;
  error?: string;
}

const SYSTEM_PROMPTS: Record<AIType, string> = {
  'ubuzima-admin': `You are RM Admin, a Platform Navigation Assistant. You help users navigate the app—not provide health information.

Guidelines:
• Help users understand app features and find resources
• Include this disclaimer: "I provide app navigation help only. For health information, consult the SRHR section or healthcare professionals."
• Direct health questions to appropriate app sections
• Never provide health information or medical guidance
• Focus strictly on platform navigation

Topics: App features, where to find resources, how to use platform tools, connecting with professionals.

Tone: Friendly, helpful, clear. Always redirect health questions to appropriate resources.`,
};

const POST_LENGTH_GUIDES: Record<PostLength, string> = {
  short: 'Provide a concise response (1-2 sentences). Make it impactful and memorable.',
  medium: 'Provide a well-structured paragraph (3-5 sentences). Balance depth with readability.',
  long: 'Provide a detailed response (2-3 paragraphs). Include context, explanation, and actionable takeaways.',
};

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  fr: 'French',
  sw: 'Swahili',
};

export async function generateAIPost(
  aiType: AIType,
  language: Language = 'en',
  length: PostLength = 'medium',
  context?: string
): Promise<GroqResponse> {
  const { groqApiKey, groqModel } = usePersistentStore.getState();

  if (!groqApiKey) {
    return {
      content: '',
      success: false,
      error: 'Groq API key not configured. Please set it in Admin Panel.',
    };
  }

  const systemPrompt = SYSTEM_PROMPTS[aiType];
  const lengthGuide = POST_LENGTH_GUIDES[length];
  const languageName = LANGUAGE_NAMES[language];

  const userPrompt = `${lengthGuide}

CRITICAL: You MUST include at least ONE of these mandatory disclaimers in your response:
- "This is educational information only. Consult a licensed professional for guidance."
- "This content is for educational purposes only and does not replace professional consultation."
- "For personalized advice, please consult a qualified professional."

Respond in ${languageName}.

${context ? `Context: ${context}` : ''}

Generate educational content about public health topics for today. Remember: This is strictly educational information, not medical or professional advice.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: length === 'short' ? 150 : length === 'medium' ? 400 : 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No content generated');
    }

    return {
      content,
      success: true,
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function getAIPersonaInfo(aiType: AIType): { name: string; title: string; color: string; badge: string; initials: string } {
  return { name: 'RM Admin', title: 'Community Guide', color: 'bg-slate-700', badge: 'Admin', initials: 'RA' };
}

export function getScheduleForAI(aiType: AIType): string {
  return '9:00 AM Monday';
}

export async function generateWelcomeMessage(language: Language): Promise<string> {
  const messages: Record<Language, string> = {
    en: "Welcome to RM Ubuzima! Your privacy is our priority. Explore AI-powered SRHR information, find nearby services, and join our weekly discussions. You're not alone on this journey.",
    rw: "Ikaze muri RM Ubuzima! Ubuzima bwawe ni ingenzi. Menya amakuru y'ubuzima, bona serivisi hafi, kandi uduhurire mu biganiro byacu bya buri cyumweru. Nti wijeje.",
    fr: "Bienvenue sur RM Ubuzima! Votre confidentialité est notre priorité. Explorez les informations SSRA, trouvez des services proches et rejoignez nos discussions hebdomadaires. Vous n'êtes pas seul.",
    sw: "Karibu RM Ubuzima! Faragha yako ni kipaumbele chetu. Chunguza habari za afya ya uzazi, pata huduma za karibu, na jiunge na mijadala yetu ya wiki. Huko peke yako.",
  };
  return messages[language];
}

export async function generateReturnMessage(daysAway: number, language: Language): Promise<string> {
  const messages: Record<Language, string[]> = {
    en: [
      "Welcome back! We missed you. New information awaits.",
      "Great to see you again! Check out today's health tips.",
      "You're back! Let's continue your wellness journey together.",
    ],
    rw: [
      "Murakaza neza! Twagucyeye. Amakuru mashya arategereje.",
      "Byiza kubona ungaruka! Reba inama z'ubuzima za uyu munsi.",
      "Wagarutse! Dukomeze urugendo rwawe rw'ubuzima hamwe.",
    ],
    fr: [
      "Bon retour! Vous nous avez manqué. Nouvelles informations vous attendent.",
      "Ravi de vous revoir! Consultez les conseils santé d'aujourd'hui.",
      "Vous êtes de retour! Continuons ensemble votre parcours bien-être.",
    ],
    sw: [
      "Karibu tena! Tumeukosa. Habari mpya zinasubiri.",
      "Nafurahi kukuona tena! Angalia vidokezo vya leo vya afya.",
      "Umerudi! Tufanye safari yako ya ustawi pamoja.",
    ],
  };
  
  const msgs = messages[language];
  return msgs[Math.min(daysAway > 7 ? 2 : daysAway > 3 ? 1 : 0, msgs.length - 1)];
}
