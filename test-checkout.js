const axios = require('axios');

// Test configuration
const API_URL = 'http://localhost:8081/api/v1';
const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual JWT token

// Test address data
const testAddress = {
  name: "Keelie Carr",
  phone: "2159361139",
  street: "Commodo quos qui ali, Ma, Maxime enim sed non, Duis sunt amet id, Aut ...",
  city: "Maxime enim sed non",
  state: "Duis sunt amet id",
  country: "Aut voluptas quia si",
  zipCode: "14248"
};

// Test checkout data
const checkoutData = {
  items: [
    {
      productId: "6789abc123def456789012345",
      title: "Test Product",
      price: 29.99,
      quantity: 1,
      image: "https://example.com/product.jpg",
      seller: {
        id: "seller123",
        businessName: "Test Seller"
      }
    }
  ],
  deliveryMethod: "delivery",
  deliveryAddress: testAddress,
  paymentCardId: null, // Will use new card
  totals: {
    subtotal: 29.99,
    deliveryFee: 5.00,
    tax: 2.40,
    discount: 0,
    total: 37.39
  },
  notes: "Test order from API"
};

async function testCheckout() {
  try {
    console.log('Testing checkout endpoint...\n');
    console.log('Address being used:', JSON.stringify(testAddress, null, 2));
    
    const response = await axios.post(
      `${API_URL}/checkout/create-payment-intent`,
      checkoutData,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Checkout successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      console.log('\n📝 Payment Details:');
      console.log('Order ID:', response.data.data.orderId);
      console.log('Order Number:', response.data.data.orderNumber);
      console.log('Payment Intent ID:', response.data.data.paymentIntentId);
      console.log('Amount:', `$${response.data.data.amount}`);
      console.log('Client Secret:', response.data.data.clientSecret ? '✓ Received' : '✗ Missing');
    }
    
  } catch (error) {
    console.error('\n❌ Checkout failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
      
      // Log validation errors if present
      if (error.response.data.error?.details) {
        console.error('\nValidation errors:');
        error.response.data.error.details.forEach(err => {
          console.error(`- ${err.path}: ${err.message}`);
        });
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Instructions
console.log('========================================');
console.log('Checkout API Test Script');
console.log('========================================\n');
console.log('To run this test:');
console.log('1. Make sure the backend is running (npm run dev)');
console.log('2. Get a valid JWT token from login');
console.log('3. Replace YOUR_JWT_TOKEN_HERE with the actual token');
console.log('4. Run: node test-checkout.js\n');
console.log('========================================\n');

// Uncomment to run the test
// testCheckout();