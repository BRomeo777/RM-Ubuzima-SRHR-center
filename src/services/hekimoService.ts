import { usePersistentStore } from '../store';

// ============================================
// HEKIMO AI - Trending News Aggregator
// Fetches trending SRHR and general news from RSS feeds
// ============================================

interface NewsItem {
  title: string;
  link: string;
  description: string;
  source: string;
  pubDate: string;
}

interface HekimoPost {
  content: string;
  references: { title: string; url: string }[];
}

// RSS feeds for SRHR topics
const SRHR_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=sexual+reproductive+health+rights&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=maternal+health+pregnancy+Africa&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=child+abuse+prevention&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=HIV+AIDS+prevention+Africa&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=gender+based+violence+Africa&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=teenage+pregnancy+Rwanda&hl=en-US&gl=US&ceid=US:en',
];

// RSS feeds for general trending news (non-SRHR)
const GENERAL_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=world+news+today&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=politics+today&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=sports+football+today&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=technology+news+today&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=Africa+news+today&hl=en-US&gl=US&ceid=US:en',
];

const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json';

async function fetchRSSFeed(rssUrl: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(
      `${RSS_TO_JSON_API}?rss_url=${encodeURIComponent(rssUrl)}&count=5`
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];
    return data.items.slice(0, 5).map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      description: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
      source: data.feed?.title || 'News',
      pubDate: item.pubDate || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[Hekimo] RSS fetch error:', error);
    return [];
  }
}

async function fetchAllFeeds(feeds: string[]): Promise<NewsItem[]> {
  const results = await Promise.all(feeds.map(fetchRSSFeed));
  return results.flat().sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}

function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function summarizeWithGroq(
  newsItems: NewsItem[],
  isSRHR: boolean
): Promise<HekimoPost | null> {
  const { groqApiKey, groqModel } = usePersistentStore.getState();

  if (!groqApiKey) {
    console.error('[Hekimo] No Groq API key configured');
    return null;
  }

  const newsContext = newsItems
    .slice(0, 10)
    .map((item, i) => `${i + 1}. ${item.title}\n   Source: ${item.source}\n   Link: ${item.link}\n   Summary: ${item.description}`)
    .join('\n\n');

  const systemPrompt = isSRHR
    ? `You are Hekimo, an AI that aggregates and summarizes trending Sexual and Reproductive Health and Rights (SRHR) news from across the web and social media. You cover topics like: sexual health, reproductive health, maternal health, pregnancy, child abuse prevention, HIV/AIDS, gender-based violence, teenage pregnancy, family planning, and LGBTQ+ health rights.

Your task:
- Write a concise, factual summary of the most trending and important SRHR news items provided.
- The summary should be informative but NOT too long — a few sentences per topic.
- Do NOT include any photos or videos.
- Include reference links at the end as "References:" with the source name and URL.
- Be factual and reference real news. Do not invent information.
- Keep the total response under 500 words.`
    : `You are Hekimo, an AI that aggregates trending general news from across the web and social media. You cover topics like: world politics, sports (football, World Cup, etc.), technology, entertainment, and breaking news.

Your task:
- Write a VERY concise summary (just a few words per item, like a headline update) of the most trending non-SRHR news.
- Keep it short — this is for a 24-hour status update, not a full article.
- Do NOT include any photos or videos.
- Include reference links at the end as "References:" with the source name and URL.
- Be factual and reference real news. Do not invent information.
- Keep the total response under 200 words.`;

  const userPrompt = `Here are the latest trending news items:\n\n${newsContext}\n\nPlease summarize the most important and trending items. Write the summary as a cohesive update. At the end, list the reference links.`;

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
        temperature: 0.5,
        max_tokens: isSRHR ? 800 : 400,
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

    const references = newsItems.slice(0, 5).map((item) => ({
      title: item.source,
      url: item.link,
    }));

    return { content, references };
  } catch (error) {
    console.error('[Hekimo] Groq API error:', error);
    return null;
  }
}

export async function generateHekimoSRHRPost(): Promise<HekimoPost | null> {
  console.log('[Hekimo] Fetching trending SRHR news...');
  const news = deduplicateNews(await fetchAllFeeds(SRHR_RSS_FEEDS));

  if (news.length === 0) {
    console.log('[Hekimo] No SRHR news found');
    return null;
  }

  console.log(`[Hekimo] Found ${news.length} SRHR news items, summarizing...`);
  return summarizeWithGroq(news, true);
}

export async function generateHekimoGeneralPost(): Promise<HekimoPost | null> {
  console.log('[Hekimo] Fetching trending general news...');
  const news = deduplicateNews(await fetchAllFeeds(GENERAL_RSS_FEEDS));

  if (news.length === 0) {
    console.log('[Hekimo] No general news found');
    return null;
  }

  console.log(`[Hekimo] Found ${news.length} general news items, summarizing...`);
  return summarizeWithGroq(news, false);
}

export function getHekimoPersonaInfo(): { name: string; title: string; color: string; badge: string; initials: string } {
  return {
    name: 'Hekimo',
    title: 'SRHR News AI',
    color: 'bg-emerald-700',
    badge: 'Hekimo',
    initials: 'He',
  };
}
