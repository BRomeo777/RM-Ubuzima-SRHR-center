import { usePersistentStore } from '../store';
import { generateHekimoSRHRPost, generateHekimoGeneralPost, getHekimoPersonaInfo, registerPostedContent, isContentAlreadyPosted } from './hekimoService';

// ============================================
// HEKIMO SCHEDULER
// Posts SRHR news at 6AM Kigali time (CAT, UTC+2)
// Additional posts every 5 hours if trending topics exist
// General (non-SRHR) news as 24h status updates at 6PM Kigali time
// ============================================

const KIGALI_OFFSET_HOURS = 2; // UTC+2
const SRHR_POST_HOUR = 6; // 6AM Kigali time
const GENERAL_POST_HOUR = 18; // 6PM Kigali time
const SRHR_INTERVAL_HOURS = 4; // Every 4 hours after 6AM

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

function getKigaliTime(): Date {
  const now = new Date();
  // Get UTC time + Kigali offset
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + KIGALI_OFFSET_HOURS * 3600000);
}

function getTodayKey(): string {
  const kigali = getKigaliTime();
  return `${kigali.getFullYear()}-${kigali.getMonth() + 1}-${kigali.getDate()}`;
}

// Collect ALL previously posted Hekimo SRHR post contents (not just today)
function getPreviouslyPostedSRHRContents(): string[] {
  const { aiPosts } = usePersistentStore.getState();
  return aiPosts
    .filter((post) => post.aiType === 'hekimo')
    .map((post) => post.content)
    .filter(Boolean);
}

// Collect ALL previously posted Hekimo status contents
function getPreviouslyPostedStatusContents(): string[] {
  const { statusUpdates } = usePersistentStore.getState();
  return statusUpdates
    .filter((status) => status.createdBy === 'hekimo')
    .map((status) => status.content)
    .filter(Boolean);
}

// Extract a short title-like signature from content for comparison
function extractTitle(content: string): string {
  return content.replace(/\n/g, ' ').replace(/References:.*$/s, '').trim().slice(0, 100);
}

function countHekimoPostsToday(): number {
  const { aiPosts } = usePersistentStore.getState();
  const todayKey = getTodayKey();

  return aiPosts.filter((post) => {
    if (post.aiType !== 'hekimo') return false;
    const postDate = new Date(post.timestamp);
    const postKigali = new Date(postDate.getTime() + postDate.getTimezoneOffset() * 60000 + KIGALI_OFFSET_HOURS * 3600000);
    const postKey = `${postKigali.getFullYear()}-${postKigali.getMonth() + 1}-${postKigali.getDate()}`;
    return postKey === todayKey;
  }).length;
}

async function postSRHRUpdate(): Promise<void> {
  console.log('[Hekimo] Generating SRHR trending post...');

  // Get all previously posted titles to avoid repeats
  const previousContents = getPreviouslyPostedSRHRContents();
  const previousTitles = previousContents.map(extractTitle);

  // Also register all previous content hashes
  previousContents.forEach(c => registerPostedContent(c));

  const hekimoPost = await generateHekimoSRHRPost(previousTitles);

  if (!hekimoPost) {
    console.log('[Hekimo] No new SRHR content to post (all already covered or no news)');
    return;
  }

  // Final check: make sure this content wasn't already posted
  if (isContentAlreadyPosted(hekimoPost.content)) {
    console.log('[Hekimo] Content already posted before, skipping');
    return;
  }

  const persona = getHekimoPersonaInfo();
  const { addAIPost, aiAvatars } = usePersistentStore.getState();

  const referencesText = hekimoPost.references.length > 0
    ? '\n\nReferences:\n' + hekimoPost.references.map((ref) => `• ${ref.title}: ${ref.url}`).join('\n')
    : '';

  const fullContent = hekimoPost.content + referencesText;

  const result = await addAIPost({
    aiType: 'hekimo',
    content: fullContent,
    category: 'srhr-trending',
    isActive: true,
    postLength: 'medium',
    views: 0,
    createdBy: 'hekimo',
    createdByName: persona.name,
    createdByAvatar: aiAvatars['hekimo'] || undefined,
    createdByBadge: persona.badge,
    type: 'text',
  });

  if (result) {
    registerPostedContent(hekimoPost.content);
    console.log('[Hekimo] SRHR post created successfully:', result.id);
  } else {
    console.error('[Hekimo] Failed to create SRHR post');
  }
}

async function postGeneralUpdate(): Promise<void> {
  console.log('[Hekimo] Generating general trending status update...');

  // Get all previously posted status contents to avoid repeats
  const previousContents = getPreviouslyPostedStatusContents();
  const previousTitles = previousContents.map(extractTitle);

  // Also register all previous content hashes
  previousContents.forEach(c => registerPostedContent(c));

  const hekimoPost = await generateHekimoGeneralPost(previousTitles);

  if (!hekimoPost) {
    console.log('[Hekimo] No new general content to post (all already covered or no news)');
    return;
  }

  // Final check: make sure this content wasn't already posted
  if (isContentAlreadyPosted(hekimoPost.content)) {
    console.log('[Hekimo] Content already posted before, skipping');
    return;
  }

  const persona = getHekimoPersonaInfo();
  const { addStatusUpdate, aiAvatars } = usePersistentStore.getState();

  const referencesText = hekimoPost.references.length > 0
    ? '\n\nReferences:\n' + hekimoPost.references.map((ref) => `• ${ref.title}: ${ref.url}`).join('\n')
    : '';

  const fullContent = hekimoPost.content + referencesText;

  const result = await addStatusUpdate({
    type: 'text',
    content: fullContent,
    viewedBy: [],
    createdBy: 'hekimo',
    createdByName: persona.name,
    createdByAvatar: aiAvatars['hekimo'] || undefined,
    createdByBadge: persona.badge,
  });

  if (result) {
    registerPostedContent(hekimoPost.content);
    console.log('[Hekimo] General status update created successfully:', result.id);
  } else {
    console.error('[Hekimo] Failed to create general status update');
  }
}

async function checkAndPost(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const kigaliTime = getKigaliTime();
    const hour = kigaliTime.getHours();
    const minute = kigaliTime.getMinutes();

    console.log(`[Hekimo] Time check — Kigali ${hour}:${String(minute).padStart(2, '0')}`);

    // 6AM (hour 6) — First SRHR post of the day
    if (hour === SRHR_POST_HOUR) {
      const postsToday = countHekimoPostsToday();
      if (postsToday === 0) {
        console.log('[Hekimo] 6AM trigger — posting first SRHR update');
        await postSRHRUpdate();
      }
    }

    // 10AM and 2PM (every 4 hours after 6AM) — additional SRHR posts
    if (hour === SRHR_POST_HOUR + SRHR_INTERVAL_HOURS || hour === SRHR_POST_HOUR + SRHR_INTERVAL_HOURS * 2) {
      const postsToday = countHekimoPostsToday();
      const expectedPostsByNow = Math.floor((hour - SRHR_POST_HOUR) / SRHR_INTERVAL_HOURS) + 1;
      if (postsToday < expectedPostsByNow && postsToday < 4) {
        console.log(`[Hekimo] ${hour}:00 trigger — posting additional SRHR update (${postsToday} posted, expected ${expectedPostsByNow})`);
        await postSRHRUpdate();
      }
    }

    // 6PM (hour 18) — General (non-SRHR) trending news as status update
    if (hour === GENERAL_POST_HOUR) {
      const hasPostedGeneralToday = getPreviouslyPostedStatusContents().some(content => {
        // Check if posted today
        const { statusUpdates } = usePersistentStore.getState();
        return statusUpdates.some(s => {
          if (s.createdBy !== 'hekimo') return false;
          const sDate = new Date(s.timestamp);
          const sKigali = new Date(sDate.getTime() + sDate.getTimezoneOffset() * 60000 + KIGALI_OFFSET_HOURS * 3600000);
          const sKey = `${sKigali.getFullYear()}-${sKigali.getMonth() + 1}-${sKigali.getDate()}`;
          return sKey === getTodayKey();
        });
      });
      if (!hasPostedGeneralToday) {
        console.log('[Hekimo] 6PM trigger — posting general status update');
        await postGeneralUpdate();
      }
    }
  } catch (error) {
    console.error('[Hekimo] Scheduler error:', error);
  } finally {
    isRunning = false;
  }
}

export function startHekimoScheduler(): void {
  if (schedulerInterval) {
    console.log('[Hekimo] Scheduler already running');
    return;
  }

  console.log('[Hekimo] Starting scheduler — only time-based triggers, no manual posting');

  // Do NOT check immediately on start — only time triggers posting
  // Check every 10 minutes for precise time-based triggers
  schedulerInterval = setInterval(() => {
    checkAndPost();
  }, 10 * 60 * 1000);
}

export function stopHekimoScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Hekimo] Scheduler stopped');
  }
}
