import { usePersistentStore } from '../store';
import { generateHekimoSRHRPost, generateHekimoGeneralPost, getHekimoPersonaInfo } from './hekimoService';

// ============================================
// HEKIMO SCHEDULER
// Posts SRHR news at 6AM Kigali time (CAT, UTC+2)
// Additional posts every 5 hours if trending topics exist
// General (non-SRHR) news as 24h status updates at 6PM Kigali time
// ============================================

const KIGALI_OFFSET_HOURS = 2; // UTC+2
const SRHR_POST_HOUR = 6; // 6AM Kigali time
const GENERAL_POST_HOUR = 18; // 6PM Kigali time
const SRHR_INTERVAL_HOURS = 5; // Every 5 hours after 6AM

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

function hasHekimoPostedToday(postType: 'srhr' | 'general'): boolean {
  const { aiPosts, statusUpdates } = usePersistentStore.getState();
  const todayKey = getTodayKey();

  if (postType === 'srhr') {
    return aiPosts.some((post) => {
      if (post.aiType !== 'hekimo') return false;
      const postDate = new Date(post.timestamp);
      const postKigali = new Date(postDate.getTime() + postDate.getTimezoneOffset() * 60000 + KIGALI_OFFSET_HOURS * 3600000);
      const postKey = `${postKigali.getFullYear()}-${postKigali.getMonth() + 1}-${postKigali.getDate()}`;
      return postKey === todayKey;
    });
  } else {
    return statusUpdates.some((status) => {
      if (status.createdBy !== 'hekimo') return false;
      const statusDate = new Date(status.timestamp);
      const statusKigali = new Date(statusDate.getTime() + statusDate.getTimezoneOffset() * 60000 + KIGALI_OFFSET_HOURS * 3600000);
      const statusKey = `${statusKigali.getFullYear()}-${statusKigali.getMonth() + 1}-${statusKigali.getDate()}`;
      return statusKey === todayKey;
    });
  }
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
  const hekimoPost = await generateHekimoSRHRPost();

  if (!hekimoPost) {
    console.log('[Hekimo] No SRHR content generated, skipping');
    return;
  }

  const persona = getHekimoPersonaInfo();
  const { addAIPost, aiAvatars } = usePersistentStore.getState();

  const fullContent = hekimoPost.content;

  const referencesText = hekimoPost.references.length > 0
    ? '\n\nReferences:\n' + hekimoPost.references.map((ref) => `• ${ref.title}: ${ref.url}`).join('\n')
    : '';

  const result = await addAIPost({
    aiType: 'hekimo',
    content: fullContent + referencesText,
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
    console.log('[Hekimo] SRHR post created successfully:', result.id);
  } else {
    console.error('[Hekimo] Failed to create SRHR post');
  }
}

async function postGeneralUpdate(): Promise<void> {
  console.log('[Hekimo] Generating general trending status update...');
  const hekimoPost = await generateHekimoGeneralPost();

  if (!hekimoPost) {
    console.log('[Hekimo] No general content generated, skipping');
    return;
  }

  const persona = getHekimoPersonaInfo();
  const { addStatusUpdate, aiAvatars } = usePersistentStore.getState();

  const referencesText = hekimoPost.references.length > 0
    ? '\n\nReferences:\n' + hekimoPost.references.map((ref) => `• ${ref.title}: ${ref.url}`).join('\n')
    : '';

  const result = await addStatusUpdate({
    type: 'text',
    content: hekimoPost.content + referencesText,
    viewedBy: [],
    createdBy: 'hekimo',
    createdByName: persona.name,
    createdByAvatar: aiAvatars['hekimo'] || undefined,
    createdByBadge: persona.badge,
  });

  if (result) {
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
    const todayKey = getTodayKey();

    console.log(`[Hekimo] Check at Kigali time ${kigaliTime.toLocaleString()} (${hour}:00)`);

    // 6AM - First SRHR post of the day
    if (hour >= SRHR_POST_HOUR && hour < SRHR_POST_HOUR + 1) {
      if (!hasHekimoPostedToday('srhr')) {
        await postSRHRUpdate();
      }
    }

    // Every 5 hours after 6AM (11AM, 4PM) - additional SRHR posts if trending
    const postsToday = countHekimoPostsToday();
    const expectedPostsByHour = Math.floor((hour - SRHR_POST_HOUR) / SRHR_INTERVAL_HOURS) + 1;

    if (hour >= SRHR_POST_HOUR + SRHR_INTERVAL_HOURS && hour < GENERAL_POST_HOUR) {
      if (postsToday < expectedPostsByHour && postsToday < 4) {
        console.log(`[Hekimo] Due for additional SRHR post (${postsToday} posted, expected ${expectedPostsByHour})`);
        await postSRHRUpdate();
      }
    }

    // 6PM - General (non-SRHR) trending news as status update
    if (hour >= GENERAL_POST_HOUR && hour < GENERAL_POST_HOUR + 1) {
      if (!hasHekimoPostedToday('general')) {
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

  console.log('[Hekimo] Starting scheduler...');

  // Check immediately on start
  checkAndPost();

  // Check every 15 minutes
  schedulerInterval = setInterval(() => {
    checkAndPost();
  }, 15 * 60 * 1000);
}

export function stopHekimoScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Hekimo] Scheduler stopped');
  }
}
