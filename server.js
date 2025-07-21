// server.js
// This is the backend server for the Bestcobb Sports Bar & Grill online order form.
// It uses the Express framework to create a simple API that listens for new orders.

// --- 1. Import Dependencies ---
// Express is the web server framework.
// Cors is a security middleware to allow your frontend website to communicate with this backend.
const express = require('express');
const cors = require('cors');

// --- 2. Initialize the Application ---
const app = express();
// Render will provide a PORT environment variable. For local testing, we default to 3000.
const PORT = process.env.PORT || 3000;

// --- 3. Configure Middleware ---
// Enable CORS for all routes, allowing your GitHub Pages site to make requests.
app.use(cors());
// Enable the Express server to parse incoming JSON data from the form.
app.use(express.json());

// --- 4. Define the API Route for Placing Orders ---
// This creates an endpoint that listens for POST requests at the URL '/api/place-order'.
app.post('/api/place-order', (req, res) => {
    // The form data sent from the website is available in the 'request body' (req.body).
    const orderData = req.body;

    // Log the received order to the server's console.
    // When you deploy this on Render, you can view these logs in your dashboard.
    console.log('--- NEW ORDER RECEIVED ---');
    console.log('Timestamp:', new Date().toUTCString());
    console.log('Customer Details:', orderData.customer);
    console.log('Order Items:', orderData.items);
    console.log('Order Total:', orderData.total);
    console.log('--------------------------\n');

    // --- YOUR CUSTOM LOGIC GOES HERE ---
    // This is where you would add code to:
    // - Save 'orderData' to a database (e.g., MongoDB, Firebase, PostgreSQL).
    // - Send a confirmation email to the customer using a service like SendGrid.
    // - Send a WhatsApp notification to your phone using an API like Twilio.
    // - Alert your kitchen staff through another system.
    
    // Send a success response back to the website to confirm the order was received.
    res.status(200).json({ 
        message: 'Order received successfully by the server!',
        orderId: `BCB-${Date.now()}` // Generate a simple, unique order ID
    });
});

// --- 5. Start the Server ---
// This command starts the server and makes it listen for incoming requests on the specified port.
app.listen(PORT, () => {
    console.log(`Bestcobb backend server is running and listening on port ${PORT}`);
});
