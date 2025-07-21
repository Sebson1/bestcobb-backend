// server.js
// Updated backend server with Twilio integration for WhatsApp notifications.

// --- 1. Import Dependencies ---
const express = require('express');
const cors = require('cors');
// Import the Twilio helper library
const twilio = require('twilio');

// --- 2. Initialize the Application ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. Twilio Configuration ---
// Get your Twilio credentials from environment variables for security.
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
// The special WhatsApp-enabled phone number you get from Twilio.
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
// Your personal phone number where you want to receive notifications.
const myPhoneNumber = process.env.MY_PHONE_NUMBER; 

// Initialize the Twilio client if credentials are provided
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

// --- 4. Configure Middleware ---
app.use(cors());
app.use(express.json());

// --- 5. Define the API Route for Placing Orders ---
app.post('/api/place-order', (req, res) => {
    const orderData = req.body;

    // Log the received order to the server's console.
    console.log('--- NEW ORDER RECEIVED ---');
    console.log('Customer:', orderData.customer);
    console.log('Items:', orderData.items);
    console.log('--------------------------\n');

    // --- Send WhatsApp Notification via Twilio ---
    if (client && twilioPhoneNumber && myPhoneNumber) {
        // Format a nice message for WhatsApp
        let notificationMessage = `*New Order Alert!* (ID: BCB-${Date.now()})\n\n`;
        notificationMessage += `*Customer:* ${orderData.customer.name}\n`;
        notificationMessage += `*Phone:* ${orderData.customer.phone}\n`;
        notificationMessage += `*Address:* ${orderData.customer.address}\n\n`;
        notificationMessage += "*--- Items ---*\n";
        orderData.items.forEach(item => {
            notificationMessage += `- ${item.quantity}x ${item.name}\n`;
        });
        notificationMessage += `\n*Total: GH₵${orderData.total}*`;

        // Use the client to send the message
        client.messages
            .create({
                from: `whatsapp:${twilioPhoneNumber}`, // From your Twilio WhatsApp number
                body: notificationMessage,
                to: `whatsapp:${myPhoneNumber}` // To your personal WhatsApp number
            })
            .then(message => console.log('WhatsApp notification sent! SID:', message.sid))
            .catch(error => console.error('Error sending WhatsApp message:', error));
    } else {
        console.log('Twilio credentials not configured. Skipping WhatsApp notification.');
    }

    // Send a success response back to the frontend
    res.status(200).json({ 
        message: 'Order received successfully by the server!',
        orderId: `BCB-${Date.now()}`
    });
});

// --- 6. Start the Server ---
app.listen(PORT, () => {
    console.log(`Bestcobb backend server is running and listening on port ${PORT}`);
});
