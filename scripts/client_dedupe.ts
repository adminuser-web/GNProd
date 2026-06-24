import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const rawConfig = fs.readFileSync('./firebase-applet-config.json', 'utf8');
const firebaseConfig = JSON.parse(rawConfig);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function dedupe() {
  console.log('Fetching products...');
  const snapshot = await getDocs(collection(db, 'products'));
  const products = [];
  snapshot.forEach(doc => {
    products.push({ id: doc.id, ...doc.data() });
  });
  
  const seenSlugs = new Set();
  const duplicateIds = [];
  
  // Sort products by some criteria to keep the oldest or specifically the ones that have more complete data.
  // Actually, just retaining the first one we encounter is fine.
  products.sort((a, b) => (a.createdAt || 0) > (b.createdAt || 0) ? 1 : -1);
  
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
  
  for (const id of duplicateIds) {
    await deleteDoc(doc(db, 'products', id));
    console.log(`Deleted ${id}`);
  }
  
  console.log('Finished removing duplicates.');
  process.exit(0);
}

dedupe().catch(e => {
  console.error(e);
  process.exit(1);
});
