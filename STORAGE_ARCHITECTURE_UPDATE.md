# Storage Architecture Update - Firebase-Only

## Summary
All application data has been moved to **Firebase Firestore**. The 5MB localStorage limit warning is now resolved.

## What Changed

### Before (Causing 5MB Warning)
- `usePersistentStore` saved ALL data to localStorage using zustand-persist
- AI posts, chat messages, user activities, notifications, etc. accumulated over time
- Hit browser's 5-10MB localStorage limit

### After (Firebase-Only Architecture)

| Data Type | Storage Location |
|-----------|-----------------|
| **AI Posts** | Firebase Firestore |
| **Chat Messages** | Firebase Firestore |
| **User Data** | Firebase Firestore |
| **Appointments** | Firebase Firestore |
| **Organizations** | Firebase Firestore |
| **Articles & Topics** | Firebase Firestore |
| **Facilities** | Firebase Firestore |
| **Emergency Contacts** | Firebase Firestore |
| **Status Updates** | Firebase Firestore |
| **Notifications** | Firebase Firestore |
| **User Activities** | Firebase Firestore |
| **Session Data** | sessionStorage (memory only) |
| **Group Profile Photos** | localStorage (10MB limit, WhatsApp-style) |

## New Files

### `src/store/localStorageStore.ts`
- New store for group profile photos only
- 10MB limit (auto-removes oldest photos when full)
- WhatsApp-style: photos stored locally on user's device

## Modified Files

### `src/store/index.ts`
- Removed `persist()` from `usePersistentStore`
- Data now lives in memory + Firebase only
- Exports new `useLocalStorageStore` for group photos

### `src/utils/storage.ts`
- Updated storage warning to only check group photos
- Removed 5MB limit warning for general data
- Added `getGroupPhotosStorageUsage()` function

## How to Use Group Profile Photos

```typescript
import { useLocalStorageStore } from '../store';

// Set group profile photo
const { setGroupProfilePhoto } = useLocalStorageStore();
setGroupProfilePhoto('group-id-123', base64ImageString);

// Get group profile photo
const { getGroupProfilePhoto } = useLocalStorageStore();
const photo = getGroupProfilePhoto('group-id-123');

// Delete group profile photo
const { deleteGroupProfilePhoto } = useLocalStorageStore();
deleteGroupProfilePhoto('group-id-123');
```

## Deployment

1. Build the app: `npm run build`
2. Deploy as usual - no changes needed to Firebase configuration
3. The app will automatically use Firebase for all data

## Benefits

1. **No more 5MB limit** - Firebase Firestore has virtually unlimited storage
2. **Real-time sync** - All users see updates instantly
3. **Offline support** - Firebase's IndexedDB persistence still works offline
4. **Multi-device** - Users can access data from any device
5. **Group photos local** - Fast loading, WhatsApp-style experience

## Notes

- Session data (login state, current page, etc.) still uses sessionStorage
- Group profile photos use localStorage with 10MB limit (auto-cleanup when full)
- All other data is fetched from Firebase on app load
