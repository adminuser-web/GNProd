import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function makeAdmin(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`User found with UID: ${user.uid}`);
    
    // Update firestore
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({ role: 'admin' }, { merge: true });
    console.log(`Successfully made ${email} an admin in Firestore.`);
    
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.log(`User ${email} does not exist. Creating them...`);
      const newUser = await auth.createUser({
        email,
        password: 'Password123!',
        displayName: 'GrainOod Admin'
      });
      console.log(`Created user with UID: ${newUser.uid}`);
      const userRef = db.collection('users').doc(newUser.uid);
      await userRef.set({
        email,
        fullName: 'GrainOod Admin',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      console.log(`Created and made ${email} an admin in Firestore.`);
    } else {
      console.error('Error:', err);
    }
  }
}

makeAdmin('connect@grainood.com');
