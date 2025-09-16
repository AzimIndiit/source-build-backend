#!/bin/bash

# Test Checkout API with curl
# Replace YOUR_JWT_TOKEN with an actual JWT token from login

API_URL="http://localhost:8081/api/v1"
JWT_TOKEN="YOUR_JWT_TOKEN"

echo "Testing Checkout API..."
echo "========================"

curl -X POST "${API_URL}/checkout/create-payment-intent" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "6789abc123def456789012345",
        "title": "Test Product",
        "price": 29.99,
        "quantity": 1,
        "image": "https://example.com/product.jpg",
        "seller": {
          "id": "seller123",
          "businessName": "Test Seller"
        }
      }
    ],
    "deliveryMethod": "delivery",
    "deliveryAddress": {
      "name": "Keelie Carr",
      "phone": "2159361139",
      "street": "Commodo quos qui ali, Ma, Maxime enim sed non, Duis sunt amet id, Aut ...",
      "city": "Maxime enim sed non",
      "state": "Duis sunt amet id",
      "country": "Aut voluptas quia si",
      "zipCode": "14248"
    },
    "totals": {
      "subtotal": 29.99,
      "deliveryFee": 5.00,
      "tax": 2.40,
      "discount": 0,
      "total": 37.39
    },
    "notes": "Test order from API"
  }' | jq

echo ""
echo "========================"
echo "Webhook endpoint: ${API_URL}/webhooks/stripe"
echo "Make sure to configure this URL in Stripe Dashboard"