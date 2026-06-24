/**
 * grainood-backend
 * 
 * To deploy:
 * firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// TODO: Integrate an email provider (like SendGrid, Resend, or AWS SES)
// or WhatsApp API provider (like Twilio, Meta WhatsApp Cloud API) here.
// const sendNotification = async (userId, title, body) => { ... }

exports.onOrderUpdated = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== after.status) {
      console.log(`Order ${context.params.orderId} status changed from ${before.status} to ${after.status}`);
      
      // TODO: Fetch user details and send an email or WhatsApp notification
      // const userSnap = await admin.firestore().collection('users').doc(after.userId).get();
      // const user = userSnap.data();
      // await sendNotification(after.userId, 'Order Status Updated', `Your order is now ${after.status}.`);
    }
  });

exports.onTicketUpdated = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if a new message was added by an admin
    if (before.messages?.length < after.messages?.length) {
      const lastMessage = after.messages[after.messages.length - 1];
      if (lastMessage.sender !== 'customer') {
         console.log(`New support reply on ticket ${context.params.ticketId}`);
         
         // TODO: Notify the customer
         // await sendNotification(after.userId, 'New Support Reply', 'An admin has replied to your request.');
      }
    }
  });
