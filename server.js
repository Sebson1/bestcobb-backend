// server.js
// Final backend server with WhatsApp notifications for you AND WhatsApp/SMS confirmations for the customer.

// --- 1. Import Dependencies ---
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

// --- 2. Initialize the Application ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. Twilio Configuration ---
// These are read from your Environment Variables on Render for security.
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
// The Twilio phone number that sends the SMS and is linked to your WhatsApp Sandbox
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
// Your personal phone number to receive WhatsApp alerts
const myPhoneNumber = process.env.MY_PHONE_NUMBER; 

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

// --- 4. Configure Middleware ---
app.use(cors());
app.use(express.json());

// --- 5. Define the API Route for Placing Orders ---
app.post('/api/place-order', (req, res) => {
    const orderData = req.body;
    const customerPhoneNumber = orderData.customer.phone;
    const orderId = `BCB-${Date.now()}`;

    console.log('--- NEW ORDER RECEIVED ---');
    console.log('Customer:', orderData.customer);
    console.log('--------------------------\n');

    if (!client || !twilioPhoneNumber) {
        console.log('Twilio credentials not fully configured. Skipping all notifications.');
    } else {
        // --- Notification 1: Send WhatsApp Alert to YOUR Phone ---
        if (myPhoneNumber) {
            let adminMessage = `*New Order Alert!* (ID: ${orderId})\n\n`;
            adminMessage += `*Customer:* ${orderData.customer.name}\n*Phone:* ${orderData.customer.phone}\n*Address:* ${orderData.customer.address}\n\n`;
            adminMessage += "*--- Items ---*\n";
            orderData.items.forEach(item => {
                adminMessage += `- ${item.quantity}x ${item.name}\n`;
            });
            adminMessage += `\n*Total: GH₵${orderData.total}*`;

            client.messages
                .create({
                    from: `whatsapp:${twilioPhoneNumber}`,
                    body: adminMessage,
                    to: `whatsapp:${myPhoneNumber}`
                })
                .then(message => console.log('Admin WhatsApp notification sent! SID:', message.sid))
                .catch(error => console.error('Error sending admin WhatsApp message:', error));
        }

        // --- Notification 2: Send WhatsApp Receipt (or SMS Fallback) to the CUSTOMER ---
        if (customerPhoneNumber) {
            const formattedCustomerNumber = `+233${customerPhoneNumber.substring(1)}`;
            
            // Create a detailed WhatsApp receipt message.
            let whatsappReceipt = `*Bestcobb Sports Bar Restaurant & Grill*\n\n`;
            whatsappReceipt += `Hi *${orderData.customer.name}*, thank you for your order!\n\n`;
            whatsappReceipt += `*Order ID:* ${orderId}\n`;
            whatsappReceipt += `*Total:* GH₵${orderData.total}\n\n`;
            whatsappReceipt += "*--- Your Items ---*\n";
            orderData.items.forEach(item => {
                whatsappReceipt += `- ${item.quantity}x ${item.name}\n`;
            });
            whatsappReceipt += `\nWe will contact you shortly to confirm delivery details.`;

            // Try sending the WhatsApp receipt first.
            client.messages
                .create({
                    from: `whatsapp:${twilioPhoneNumber}`,
                    body: whatsappReceipt,
                    to: `whatsapp:${formattedCustomerNumber}` // Send to customer's WhatsApp
                })
                .then(message => console.log('Customer WhatsApp receipt sent! SID:', message.sid))
                .catch(error => {
                    // If sending WhatsApp fails, log the error and fall back to sending an SMS.
                    console.error('Could not send WhatsApp to customer (they may not have it), falling back to SMS. Error:', error.message);
                    
                    let smsMessage = `Bestcobb Sports Bar & Grill: Hi ${orderData.customer.name}, we have received your order! Total: GH₵${orderData.total}. We will contact you shortly to confirm.`;

                    client.messages
                        .create({
                            body: smsMessage,
                            from: twilioPhoneNumber, // Your purchased Twilio number
                            to: formattedCustomerNumber // The customer's phone number
                        })
                        .then(message => console.log('Customer SMS confirmation sent! SID:', message.sid))
                        .catch(smsError => console.error('Error sending customer SMS:', smsError));
                });
        }
    }

    // Send a success response back to the frontend
    res.status(200).json({ 
        message: 'Order received successfully!',
        orderId: orderId
    });
});

// --- 6. Start the Server ---
app.listen(PORT, () => {
    console.log(`Bestcobb backend server is running and listening on port ${PORT}`);
});
