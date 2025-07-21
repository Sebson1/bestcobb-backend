// server.js
// Final backend with Paystack payment verification.

// --- 1. Import Dependencies ---
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const https = require('https'); // Node's built-in module for making HTTPS requests

// --- 2. Initialize the Application ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. Twilio & Paystack Configuration ---
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const myPhoneNumber = process.env.MY_PHONE_NUMBER; 
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY; // Your Paystack SECRET key

const twilioClient = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

// --- 4. Configure Middleware ---
app.use(cors());
app.use(express.json());

// --- 5. Paystack Verification Function ---
const verifyPaystackPayment = (reference) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', error => {
            reject(error);
        });
        req.end();
    });
};


// --- 6. Define the API Route for Placing Orders ---
app.post('/api/place-order', async (req, res) => {
    const orderData = req.body;
    const { customer, items, total, orderDate, paymentMethod, paystackReference } = orderData;
    const orderId = `BCB-${Date.now()}`;

    try {
        // --- If it's a Paystack order, VERIFY the payment first ---
        if (paymentMethod === 'Pay Online with Paystack') {
            if (!paystackReference) {
                return res.status(400).json({ message: "Paystack reference is missing." });
            }
            if (!paystackSecretKey) {
                console.error("PAYSTACK_SECRET_KEY is not set on the server.");
                return res.status(500).json({ message: "Payment processor not configured." });
            }

            console.log(`Verifying Paystack payment with reference: ${paystackReference}`);
            const verificationResponse = await verifyPaystackPayment(paystackReference);

            // Check if payment was successful and for the correct amount
            const isPaymentValid = verificationResponse.status === true &&
                                   verificationResponse.data.status === 'success' &&
                                   verificationResponse.data.currency === 'GHS' &&
                                   (verificationResponse.data.amount / 100) >= parseFloat(total);

            if (!isPaymentValid) {
                console.error("Paystack verification failed:", verificationResponse.data.gateway_response);
                return res.status(400).json({ message: "Payment verification failed. Please contact support." });
            }
            console.log("Paystack payment verified successfully.");
        }

        // --- If verification passes (or not a Paystack order), proceed with notifications ---
        console.log('--- PROCESSING ORDER ---');
        console.log(`Order Date: ${orderDate}`);
        console.log(`Payment Method: ${paymentMethod}`);
        console.log('Customer:', customer);
        console.log('--------------------------\n');

        if (twilioClient && twilioPhoneNumber) {
            // Send notifications (condensed for brevity, logic is the same as before)
            const formattedCustomerNumber = `+233${customer.phone.substring(1)}`;
            let adminMessage = `*New Order for ${orderDate}!* (ID: ${orderId})\n\n*Payment:* ${paymentMethod}\n\n*Customer:* ${customer.name}\n*Phone:* ${customer.phone}\n*Address:* ${customer.address}\n\n*--- Items ---*\n`;
            items.forEach(item => { adminMessage += `- ${item.quantity}x ${item.name}\n`; });
            adminMessage += `\n*Total: GH₵${total}*`;

            twilioClient.messages.create({ from: `whatsapp:${twilioPhoneNumber}`, body: adminMessage, to: `whatsapp:${myPhoneNumber}` });
            
            let customerMessage = `Bestcobb Sports Bar & Grill: Hi ${customer.name}, we have received your order for ${orderDate} (Payment: ${paymentMethod})! Total: GH₵${total}. We will contact you shortly.`;
            twilioClient.messages.create({ body: customerMessage, from: twilioPhoneNumber, to: formattedCustomerNumber });
        }

        res.status(200).json({ message: 'Order received successfully!', orderId: orderId });

    } catch (error) {
        console.error("Error processing order:", error);
        res.status(500).json({ message: "An internal error occurred. Please contact support." });
    }
});

// --- 7. Start the Server ---
app.listen(PORT, () => {
    console.log(`Bestcobb backend server is running and listening on port ${PORT}`);
});
