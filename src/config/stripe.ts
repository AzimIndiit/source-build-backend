import Stripe from 'stripe';
import config from './index.js';


const stripe = new Stripe(config.STRIPE.SECRET_KEY || '');

export default stripe;