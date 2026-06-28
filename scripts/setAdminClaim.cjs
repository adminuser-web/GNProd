// Set the Firebase admin custom claim for a user (required for Storage uploads).
//
// This repo is ESM ("type":"module"), so this script uses the .cjs extension and
// the firebase-admin v14 modular API.
//
// Usage with a service-account key:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/setAdminClaim.cjs admin@grainood.com
//
// Usage with Application Default Credentials (when org policy blocks key creation):
//   gcloud auth application-default login
//   gcloud auth application-default set-quota-project <project-id>
//   GOOGLE_CLOUD_PROJECT=<project-id> node scripts/setAdminClaim.cjs admin@grainood.com
//
// The user signs out/in afterward so their ID token picks up the new claim.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/setAdminClaim.cjs <email>');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT });

(async () => {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ admin claim set for ${email} (uid ${user.uid}). Sign out/in to refresh the token.`);
  process.exit(0);
})().catch((e) => {
  console.error('Failed:', e && (e.message || e));
  process.exit(1);
});
