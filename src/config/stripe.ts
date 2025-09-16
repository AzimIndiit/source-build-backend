import Stripe from 'stripe'
import config from './index.js'

if (!config.stripe.secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-08-27.basil' as any,
  typescript: true,
})

export default stripe
