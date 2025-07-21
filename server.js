// server.js
// Final backend server with date selection, WhatsApp notifications for you AND WhatsApp/SMS confirmations for the customer.

// --- 1. Import Dependencies ---
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

// --- 2. Initialize the Application ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. Twilio Configuration ---
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const myPhoneNumber = process.env.MY_PHONE_NUMBER; 

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

// --- 4. Configure Middleware ---
app.use(cors());
app.use(express.json());

// --- 5. Define the API Route for Placing Orders ---
app.post('/api/place-order', (req, res) => {
    const orderData = req.body;
    const customerPhoneNumber = orderData.customer.phone;
    const orderDate = orderData.orderDate; // Get the selected date (e.g., "2025-07-22")
    const orderId = `BCB-${Date.now()}`;

    console.log('--- NEW ORDER RECEIVED ---');
    console.log(`Order Date: ${orderDate}`);
    console.log('Customer:', orderData.customer);
    console.log('--------------------------\n');

    if (!client || !twilioPhoneNumber) {
        console.log('Twilio credentials not fully configured. Skipping all notifications.');
    } else {
        // --- Notification 1: Send WhatsApp Alert to YOUR Phone ---
        if (myPhoneNumber) {
            // UPDATED: Added the specific date to the admin alert
            let adminMessage = `*New Order Alert for ${orderDate}!* (ID: ${orderId})\n\n`;
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
            
            // UPDATED: Added the specific date to the customer receipt
            let whatsappReceipt = `*Bestcobb Sports Bar Restaurant & Grill*\n\n`;
            whatsappReceipt += `Hi *${orderData.customer.name}*, thank you for your order scheduled for *${orderDate}*!\n\n`;
            whatsappReceipt += `*Order ID:* ${orderId}\n`;
            whatsappReceipt += `*Total:* GH₵${orderData.total}\n\n`;
            whatsappReceipt += "*--- Your Items ---*\n";
            orderData.items.forEach(item => {
                whatsappReceipt += `- ${item.quantity}x ${item.name}\n`;
            });
            whatsappReceipt += `\nWe will contact you shortly to confirm delivery details.`;

            client.messages
                .create({
                    from: `whatsapp:${twilioPhoneNumber}`,
                    body: whatsappReceipt,
                    to: `whatsapp:${formattedCustomerNumber}`
                })
                .then(message => console.log('Customer WhatsApp receipt sent! SID:', message.sid))
                .catch(error => {
                    console.error('Could not send WhatsApp to customer, falling back to SMS. Error:', error.message);
                    
                    let smsMessage = `Bestcobb Sports Bar & Grill: Hi ${orderData.customer.name}, we have received your order for ${orderDate}! Total: GH₵${orderData.total}. We will contact you shortly.`;

                    client.messages
                        .create({
                            body: smsMessage,
                            from: twilioPhoneNumber,
                            to: formattedCustomerNumber
                        })
                        .then(message => console.log('Customer SMS confirmation sent! SID:', message.sid))
                        .catch(smsError => console.error('Error sending customer SMS:', smsError));
                });
        }
    }

    res.status(200).json({ 
        message: 'Order received successfully!',
        orderId: orderId
    });
});

// --- 6. Start the Server ---
app.listen(PORT, () => {
    console.log(`Bestcobb backend server is running and listening on port ${PORT}`);
});
