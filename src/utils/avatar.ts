// Local Avatar System
// Uses uploaded custom avatar images stored in public/avatars/

export interface AvatarOption {
  id: number;
  url: string;
  seed: number;
}

// Array of 28 local avatar image paths (matching uploaded files)
const LOCAL_AVATAR_PATHS: string[] = [
  '/avatars/uifaces-cartoon-avatar.jpg',
  '/avatars/uifaces-cartoon-avatar (1).jpg',
  '/avatars/uifaces-cartoon-avatar (2).jpg',
  '/avatars/uifaces-cartoon-avatar (3).jpg',
  '/avatars/uifaces-cartoon-avatar (4).jpg',
  '/avatars/uifaces-cartoon-avatar (5).jpg',
  '/avatars/uifaces-cartoon-avatar (6).jpg',
  '/avatars/uifaces-cartoon-avatar (7).jpg',
  '/avatars/uifaces-cartoon-avatar (8).jpg',
  '/avatars/uifaces-cartoon-avatar (9).jpg',
  '/avatars/uifaces-cartoon-avatar (10).jpg',
  '/avatars/uifaces-cartoon-avatar (11).jpg',
  '/avatars/uifaces-cartoon-avatar (12).jpg',
  '/avatars/uifaces-cartoon-avatar (13).jpg',
  '/avatars/uifaces-cartoon-avatar (14).jpg',
  '/avatars/uifaces-cartoon-avatar (15).jpg',
  '/avatars/uifaces-cartoon-avatar (16).jpg',
  '/avatars/uifaces-cartoon-avatar (17).jpg',
  '/avatars/uifaces-cartoon-avatar (18).jpg',
  '/avatars/uifaces-cartoon-avatar (19).jpg',
  '/avatars/uifaces-cartoon-avatar (20).jpg',
  '/avatars/uifaces-cartoon-avatar (21).jpg',
  '/avatars/uifaces-cartoon-avatar (22).jpg',
  '/avatars/uifaces-cartoon-avatar (23).jpg',
  '/avatars/uifaces-cartoon-avatar (24).jpg',
  '/avatars/uifaces-cartoon-avatar (25).jpg',
  '/avatars/uifaces-cartoon-avatar (26).jpg',
  '/avatars/uifaces-cartoon-avatar (27).jpg',
];

/**
 * Get a local avatar URL by index (1-28)
 */
export const createSmartAvatar = (seed: number | string): string => {
  const index = typeof seed === 'number' 
    ? ((seed - 1) % LOCAL_AVATAR_PATHS.length) + 1
    : (Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % LOCAL_AVATAR_PATHS.length) + 1;
  return LOCAL_AVATAR_PATHS[index - 1] || LOCAL_AVATAR_PATHS[0];
};

/**
 * Generate all 28 avatar options
 */
export const generateProfessionalAvatars = (): AvatarOption[] => {
  return LOCAL_AVATAR_PATHS.map((path, i) => ({
    id: i + 1,
    url: path,
    seed: i + 1
  }));
};

/**
 * Get a random avatar from the local set
 */
export const getRandomAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * LOCAL_AVATAR_PATHS.length);
  return LOCAL_AVATAR_PATHS[randomIndex];
};

/**
 * Get default AI avatars for each AI type (only ubuzima-admin remains)
 */
export const getDefaultAIAvatars = (): Record<string, string> => ({
  'ubuzima-admin': LOCAL_AVATAR_PATHS[0]
});

/**
 * Predefined avatar set for user selection (all 28 avatars)
 */
export const USER_AVATAR_OPTIONS: AvatarOption[] = generateProfessionalAvatars();

/**
 * Get avatar URL by index (1-28)
 */
export const getAvatarBySeed = (seed: number): string => {
  const index = ((seed - 1) % LOCAL_AVATAR_PATHS.length);
  return LOCAL_AVATAR_PATHS[index];
};

/**
 * Avatar picker configuration
 */
export const AVATAR_PICKER_CONFIG = {
  columns: 5,
  gap: '1rem',
  avatarSize: 'w-20 h-20',
  selectedRing: 'ring-4 ring-srhr ring-offset-2',
  hoverScale: 'hover:scale-110'
};
