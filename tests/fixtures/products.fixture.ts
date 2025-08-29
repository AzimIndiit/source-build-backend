export const testProducts = {
  electronics: {
    _id: '607f1f77bcf86cd799439021',
    title: 'Test Laptop',
    description: 'High-performance laptop for testing',
    price: 999.99,
    discountedPrice: 899.99,
    category: 'Electronics',
    subcategory: 'Computers',
    brand: 'TestBrand',
    seller: '507f1f77bcf86cd799439012', // seller from users fixture
    images: [
      'https://example.com/laptop1.jpg',
      'https://example.com/laptop2.jpg',
      'https://example.com/laptop3.jpg'
    ],
    specifications: {
      processor: 'Intel Core i7',
      ram: '16GB',
      storage: '512GB SSD',
      display: '15.6 inch FHD',
      weight: '1.8kg'
    },
    stock: 50,
    sku: 'LAP-TEST-001',
    tags: ['laptop', 'computer', 'electronics', 'tech'],
    rating: {
      average: 4.5,
      count: 25
    },
    sold: 15,
    views: 500,
    isActive: true,
    isFeatured: true,
    shippingInfo: {
      weight: 2.0,
      dimensions: {
        length: 40,
        width: 30,
        height: 5
      },
      freeShipping: true,
      estimatedDelivery: '3-5 business days',
      shippingCost: 0
    },
    returnPolicy: {
      returnable: true,
      returnWindow: 30,
      restockingFee: 0
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  clothing: {
    _id: '607f1f77bcf86cd799439022',
    title: 'Test T-Shirt',
    description: 'Comfortable cotton t-shirt',
    price: 29.99,
    category: 'Clothing',
    subcategory: 'Shirts',
    brand: 'TestWear',
    seller: '507f1f77bcf86cd799439012',
    images: [
      'https://example.com/tshirt1.jpg',
      'https://example.com/tshirt2.jpg'
    ],
    specifications: {
      material: '100% Cotton',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black', 'White', 'Blue', 'Red'],
      care: 'Machine wash cold'
    },
    variants: [
      {
        size: 'S',
        color: 'Black',
        stock: 10,
        sku: 'TSH-BLK-S'
      },
      {
        size: 'M',
        color: 'Black',
        stock: 15,
        sku: 'TSH-BLK-M'
      },
      {
        size: 'L',
        color: 'Black',
        stock: 20,
        sku: 'TSH-BLK-L'
      }
    ],
    stock: 45,
    sku: 'TSH-TEST-001',
    tags: ['clothing', 't-shirt', 'casual', 'cotton'],
    rating: {
      average: 4.2,
      count: 50
    },
    sold: 100,
    views: 1000,
    isActive: true,
    shippingInfo: {
      weight: 0.2,
      dimensions: {
        length: 30,
        width: 25,
        height: 2
      },
      freeShipping: false,
      estimatedDelivery: '5-7 business days',
      shippingCost: 5.99
    },
    returnPolicy: {
      returnable: true,
      returnWindow: 14,
      restockingFee: 0
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  food: {
    _id: '607f1f77bcf86cd799439023',
    title: 'Test Organic Coffee',
    description: 'Premium organic coffee beans',
    price: 24.99,
    category: 'Food & Beverages',
    subcategory: 'Coffee',
    brand: 'TestBrew',
    seller: '507f1f77bcf86cd799439012',
    images: [
      'https://example.com/coffee1.jpg'
    ],
    specifications: {
      origin: 'Colombia',
      roast: 'Medium',
      weight: '500g',
      type: 'Arabica',
      organic: true,
      fairTrade: true
    },
    stock: 200,
    sku: 'COF-TEST-001',
    tags: ['coffee', 'organic', 'beverage', 'arabica'],
    rating: {
      average: 4.8,
      count: 75
    },
    sold: 250,
    views: 2000,
    isActive: true,
    expiryDate: new Date('2025-01-01'),
    shippingInfo: {
      weight: 0.5,
      dimensions: {
        length: 20,
        width: 15,
        height: 10
      },
      freeShipping: false,
      estimatedDelivery: '2-4 business days',
      shippingCost: 4.99
    },
    returnPolicy: {
      returnable: false,
      returnWindow: 0,
      restockingFee: 0
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  outOfStock: {
    _id: '607f1f77bcf86cd799439024',
    title: 'Out of Stock Product',
    description: 'This product is currently out of stock',
    price: 49.99,
    category: 'Electronics',
    subcategory: 'Accessories',
    seller: '507f1f77bcf86cd799439012',
    images: ['https://example.com/product.jpg'],
    stock: 0,
    sku: 'OOS-TEST-001',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },

  inactive: {
    _id: '607f1f77bcf86cd799439025',
    title: 'Inactive Product',
    description: 'This product is inactive',
    price: 99.99,
    category: 'Electronics',
    subcategory: 'Gadgets',
    seller: '507f1f77bcf86cd799439012',
    images: ['https://example.com/inactive.jpg'],
    stock: 10,
    sku: 'INA-TEST-001',
    isActive: false,
    deactivatedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  }
};

export const createTestProduct = (overrides = {}) => {
  return {
    ...testProducts.electronics,
    ...overrides
  };
};

export const createManyTestProducts = (count: number, sellerId: string) => {
  const categories = ['Electronics', 'Clothing', 'Food & Beverages', 'Home & Garden', 'Sports'];
  
  return Array.from({ length: count }, (_, i) => ({
    _id: `607f1f77bcf86cd7994390${30 + i}`,
    title: `Test Product ${i}`,
    description: `Description for test product ${i}`,
    price: Math.floor(Math.random() * 900) + 100,
    category: categories[i % categories.length],
    subcategory: 'Test Subcategory',
    seller: sellerId,
    images: [`https://example.com/product${i}.jpg`],
    stock: Math.floor(Math.random() * 100) + 1,
    sku: `TEST-${i.toString().padStart(3, '0')}`,
    tags: ['test', 'product'],
    rating: {
      average: Math.random() * 2 + 3, // 3-5 rating
      count: Math.floor(Math.random() * 100)
    },
    sold: Math.floor(Math.random() * 50),
    views: Math.floor(Math.random() * 500),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }));
};

export const productSearchData = [
  {
    _id: '607f1f77bcf86cd799439040',
    title: 'Apple iPhone 14 Pro',
    description: 'Latest iPhone with advanced features',
    price: 1299.99,
    category: 'Electronics',
    subcategory: 'Smartphones',
    brand: 'Apple',
    tags: ['iphone', 'smartphone', 'apple', 'mobile', 'pro'],
    searchKeywords: 'iphone apple smartphone mobile phone pro max'
  },
  {
    _id: '607f1f77bcf86cd799439041',
    title: 'Samsung Galaxy S23 Ultra',
    description: 'Premium Android smartphone',
    price: 1199.99,
    category: 'Electronics',
    subcategory: 'Smartphones',
    brand: 'Samsung',
    tags: ['samsung', 'galaxy', 'android', 'smartphone', 'ultra'],
    searchKeywords: 'samsung galaxy android smartphone mobile phone s23 ultra'
  },
  {
    _id: '607f1f77bcf86cd799439042',
    title: 'Nike Air Max 270',
    description: 'Comfortable running shoes',
    price: 159.99,
    category: 'Sports & Outdoors',
    subcategory: 'Footwear',
    brand: 'Nike',
    tags: ['nike', 'shoes', 'running', 'sports', 'air max'],
    searchKeywords: 'nike air max shoes running sports footwear sneakers'
  }
];