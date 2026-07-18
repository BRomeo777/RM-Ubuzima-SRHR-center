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

// Track previously posted content hashes to never repeat
const postedContentHashes = new Set<string>();

function hashContent(text: string): string {
  // Normalize: lowercase, remove extra whitespace, first 200 chars
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function registerPostedContent(content: string): void {
  postedContentHashes.add(hashContent(content));
}

export function isContentAlreadyPosted(content: string): boolean {
  return postedContentHashes.has(hashContent(content));
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
  isSRHR: boolean,
  previouslyPostedTitles: string[] = []
): Promise<HekimoPost | null> {
  const { groqApiKey, groqModel } = usePersistentStore.getState();

  if (!groqApiKey) {
    console.error('[Hekimo] No Groq API key configured — set it in Admin Panel');
    return null;
  }

  // Filter out news items whose titles were already posted
  const postedLower = previouslyPostedTitles.map(t => t.toLowerCase().slice(0, 80));
  const freshNews = newsItems.filter(item => {
    const titleKey = item.title.toLowerCase().slice(0, 80);
    return !postedLower.some(pt => titleKey.includes(pt) || pt.includes(titleKey));
  });

  if (freshNews.length === 0) {
    console.log('[Hekimo] All news items already posted, skipping');
    return null;
  }

  const newsContext = freshNews
    .slice(0, 8)
    .map((item, i) => `${i + 1}. ${item.title}\n   Source: ${item.source}\n   Link: ${item.link}\n   Summary: ${item.description}`)
    .join('\n\n');

  const avoidList = previouslyPostedTitles.length > 0
    ? `\n\nIMPORTANT: Do NOT cover these topics/news that were already posted previously:\n${previouslyPostedTitles.slice(-10).map(t => `- ${t}`).join('\n')}\n\nOnly cover NEW, different news. Never repeat a topic or news item that was already posted.`
    : '';

  const systemPrompt = isSRHR
    ? `You are Hekimo, an AI that aggregates and summarizes trending Sexual and Reproductive Health and Rights (SRHR) news. You cover: sexual health, reproductive health, maternal health, pregnancy, child abuse prevention, HIV/AIDS, gender-based violence, teenage pregnancy, family planning.

Rules:
- Write a SHORT, well-formatted summary — 2-3 brief paragraphs maximum.
- Pick only the TOP 2-3 most important and trending items.
- Each item: 1-2 sentences only. Be concise.
- Do NOT include photos or videos.
- At the end, add "References:" with source name and URL for each item.
- Be factual. Do not invent information.
- Keep total response under 250 words.
- Never repeat news that was already posted before.`
    : `You are Hekimo, an AI that posts VERY short trending general news updates (non-SRHR). Topics: world politics, sports, technology, breaking news.

Rules:
- Write a VERY SHORT update — like a brief headline summary.
- Maximum 3-4 short sentences total. This is a 24-hour status, not an article.
- Pick only the TOP 1-2 most trending items.
- Do NOT include photos or videos.
- At the end, add "References:" with source name and URL.
- Be factual. Do not invent information.
- Keep total response under 80 words.
- Never repeat news that was already posted before.`;

  const userPrompt = `Here are the latest trending news items:\n\n${newsContext}${avoidList}\n\nSummarize only the most important NEW items. Be concise. List reference links at the end.`;

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
        temperature: 0.6,
        max_tokens: isSRHR ? 400 : 150,
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

    const references = freshNews.slice(0, 3).map((item) => ({
      title: item.source,
      url: item.link,
    }));

    // Double-check: if this exact content was already posted, skip
    if (isContentAlreadyPosted(content)) {
      console.log('[Hekimo] Generated content matches a previous post, skipping');
      return null;
    }

    return { content, references };
  } catch (error) {
    console.error('[Hekimo] Groq API error:', error);
    return null;
  }
}

export async function generateHekimoSRHRPost(previouslyPostedTitles: string[] = []): Promise<HekimoPost | null> {
  console.log('[Hekimo] Fetching trending SRHR news...');
  const news = deduplicateNews(await fetchAllFeeds(SRHR_RSS_FEEDS));

  if (news.length === 0) {
    console.log('[Hekimo] No SRHR news found');
    return null;
  }

  console.log(`[Hekimo] Found ${news.length} SRHR news items, summarizing...`);
  return summarizeWithGroq(news, true, previouslyPostedTitles);
}

export async function generateHekimoGeneralPost(previouslyPostedTitles: string[] = []): Promise<HekimoPost | null> {
  console.log('[Hekimo] Fetching trending general news...');
  const news = deduplicateNews(await fetchAllFeeds(GENERAL_RSS_FEEDS));

  if (news.length === 0) {
    console.log('[Hekimo] No general news found');
    return null;
  }

  console.log(`[Hekimo] Found ${news.length} general news items, summarizing...`);
  return summarizeWithGroq(news, false, previouslyPostedTitles);
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
