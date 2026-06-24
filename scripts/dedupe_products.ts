import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from '../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp({
  credential: applicationDefault(),
  projectId: config.projectId,
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function dedupe() {
  console.log('Fetching products...');
  const snapshot = await db.collection('products').get();
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const seenSlugs = new Set();
  const duplicateIds = [];
  
  for (const product of products) {
    if (seenSlugs.has(product.slug)) {
      console.log(`Duplicate found: ${product.name} (${product.slug}) [${product.id}]`);
      duplicateIds.push(product.id);
    } else {
      seenSlugs.add(product.slug);
    }
  }
  
  if (duplicateIds.length === 0) {
    console.log('No duplicates found!');
    return;
  }
  
  console.log(`Deleting ${duplicateIds.length} duplicates...`);
  
  // Delete in batches
  const batchSize = 50;
  for (let i = 0; i < duplicateIds.length; i += batchSize) {
    const batchList = duplicateIds.slice(i, i + batchSize);
    const batch = db.batch();
    for (const id of batchList) {
      batch.delete(db.collection('products').doc(id));
    }
    await batch.commit();
    console.log(`Deleted batch of ${batchList.length}`);
  }
  
  console.log('Finished removing duplicates.');
}

dedupe().catch(console.error);
