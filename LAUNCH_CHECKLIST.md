# Grainood Production Launch Checklist

## Pre-Launch Validation

1. [x] **Environment Variables**
   - Confirm all production Firebase keys are set in the hosting environment.
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

2. [x] **Firebase Rules (Security)**
   - `firestore.rules` deployed.
   - `storage.rules` deployed.
   - Verified that non-admins cannot write to `products` or `orders`.
   - Verified customers can only read their own `orders` and `savedBuilds`.
   - Support attachments upload access is authenticated.

3. [x] **Admin Setup**
   - At least one valid admin account has `role: 'admin'` set in the `users` collection.
   - All legacy dummy products/orders cleared via Firebase console if required.

## Final QA Flows (Manual)

### Customer Experience
- [x] Homepage loads quickly without layout shifts.
- [x] Can use the AI Bat Consultant and get a result.
- [x] Can customize a bat, configure add-ons, and add to cart.
- [x] Can view Cart and Checkout details correctly.
- [x] Address fields and validations work properly.
- [x] Order confirmation shows UPI logic clearly.
- [x] "My Orders" displays recent order cleanly.
- [x] Receipt is locked (Cannot view receipt while payment is "pending").
- [x] Wait for payment confirmation.
- [x] Receipt unlocks and renders correctly for print.

### Admin Experience
- [x] Admin dashboard pulls live metrics correctly.
- [x] Admin can see Pending Payments and Confirmed Sales.
- [x] Admin can view the new order and mark payment as "Confirmed".
- [x] Admin can set shipping details.
- [x] Admin products list load without errors.
- [x] Sub-series creation/edit forms save correctly without validation loops.

### Support & Mobile
- [x] Customer can file new Support Request from `OrderDetailPage`.
- [x] Admin sees Support Request and can reply.
- [x] Complete website passes responsive checks on a typical mobile device aspect ratio.
- [x] Navigation hamburger menu is working properly and does not overlap.

## Deployment Steps

1. Lint codebase: `npm run lint`
2. Test codebase: `npm run test`
3. Build step: `npm run build`
4. Review preview: `npm run preview`
5. Map production custom domain rules (A/CNAME records).
6. Verify wildcard SSL or Let's Encrypt provisions.
7. Go Live.
