import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PUBLISHED_PRODUCTS } from '../types';

export async function seedProducts(force = false) {
  try {
    const productsRef = collection(db, 'products');
    const productsSnap = await getDocs(productsRef);
    
    // Cleanup any duplicates with subSeries name containing 'nova'
    for (const docSnap of productsSnap.docs) {
      const data = docSnap.data();
      if (data.subSeries) {
         if (data.subSeries.some((s: any) => s.name && s.name.toLowerCase().includes('nova'))) {
            console.log(`Deleting old duplicate product: ${docSnap.id}`);
            await deleteDoc(doc(db, 'products', docSnap.id));
         }
      }
    }

    if (productsSnap.empty || force) {
      console.log('Seeding products...');
      for (const product of PUBLISHED_PRODUCTS) {
        const docRef = doc(db, 'products', product.id);
        await setDoc(docRef, product, { merge: false });
      }
      console.log('Products seeded successfully.');
    } else {
      console.log('Products collection is not empty, running migration checks...');
      let migrated = false;
      for (const docSnap of productsSnap.docs) {
        const data = docSnap.data();
        if (!data.subSeries || data.subSeries.length === 0) {
          const defaultProduct = PUBLISHED_PRODUCTS.find(p => p.id === docSnap.id || p.slug === data.slug);
          if (defaultProduct && defaultProduct.subSeries && defaultProduct.subSeries.length > 0) {
            console.log(`Migrating product ${docSnap.id} to include subSeries...`);
            const docRef = doc(db, 'products', docSnap.id);
            await setDoc(docRef, { subSeries: defaultProduct.subSeries }, { merge: true });
            migrated = true;
          }
        }
      }
      if (migrated) {
        console.log('Product migration completed successfully.');
      } else {
        console.log('Products are already migrated, forcing update just in case.');
        for (const defaultProduct of PUBLISHED_PRODUCTS) {
          const docRef = doc(db, 'products', defaultProduct.id);
          await setDoc(docRef, defaultProduct, { merge: true });
        }
        console.log('Products force-updated.');
      }
    }
  } catch (error) {
    console.error('Error seeding/migrating products:', error);
  }
}
