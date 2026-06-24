const admin = require('firebase-admin');

// 1. Download your Firebase service account key JSON from the Firebase Console (Project Settings > Service Accounts).
// 2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to the JSON file path.
// Example: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

admin.initializeApp();

const setAdminClaim = async (email) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    if (!user) {
      console.log(`User ${email} not found.`);
      return;
    }
    
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Successfully set admin claim for ${email}.`);
  } catch (error) {
    console.error(`Error setting admin claim: ${error}`);
  }
};

const email = process.argv[2];
if (!email) {
  console.log('Please provide an email address. Example: node setAdminClaim.js user@example.com');
  process.exit(1);
}

setAdminClaim(email);
