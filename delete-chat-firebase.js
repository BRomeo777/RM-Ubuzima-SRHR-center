/**
 * Firebase Chat Data Deletion Script
 * 
 * This script deletes all chat-related data from Firestore.
 * 
 * Prerequisites:
 * 1. Install Node.js
 * 2. Run: npm install firebase-admin
 * 3. Download your service account key from Firebase Console:
 *    Project Settings > Service Accounts > Generate New Private Key
 * 4. Save the JSON file as 'serviceAccountKey.json' in this directory
 * 
 * Usage:
 * node delete-chat-firebase.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Delete all documents in a collection
 */
async function deleteCollection(collectionPath, batchSize = 500) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);
  
  console.log(`Deleting documents from: ${collectionPath}`);
  
  let deletedCount = 0;
  
  while (true) {
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`  ✓ Deleted ${deletedCount} documents from ${collectionPath}`);
      break;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    console.log(`  Progress: ${deletedCount} documents deleted...`);
    
    // Small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Delete all chat data
 */
async function deleteAllChatData() {
  console.log('\n🔥 Starting chat data deletion from Firebase...\n');
  
  try {
    // Delete chat_messages collection
    await deleteCollection('chat_messages');
    
    // Delete chat_rooms collection
    await deleteCollection('chat_rooms');
    
    // Delete chat_participants collection
    await deleteCollection('chat_participants');
    
    // Delete chat_settings collection
    await deleteCollection('chat_settings');
    
    console.log('\n✅ All chat data successfully deleted from Firebase!');
    console.log('\nCollections removed:');
    console.log('  - chat_messages');
    console.log('  - chat_rooms');
    console.log('  - chat_participants');
    console.log('  - chat_settings');
    console.log('\n🧹 Remember to also clear browser localStorage for all users.');
    
  } catch (error) {
    console.error('\n❌ Error deleting chat data:', error);
    console.error('\nMake sure you have:');
    console.error('  1. Correct serviceAccountKey.json file');
    console.error('  2. Proper Firebase project permissions');
    console.error('  3. Firebase Admin SDK installed: npm install firebase-admin');
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

// Run the deletion
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     RM UBUZIMA - CHAT DATA DELETION TOOL              ║');
console.log('╚════════════════════════════════════════════════════════╝');

deleteAllChatData();
