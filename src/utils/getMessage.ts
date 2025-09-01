export const getMessage = (key: keyof typeof messages, role: keyof typeof messages[keyof typeof messages]) => {
  return messages[key][role];
};

const messages = {
  WELCOME: {
    seller: 'Welcome to Source Build! Start exploring and add your products today.',
    buyer: 'Welcome to Source Build! Start exploring and add your reviews today.',
    driver: 'Welcome to Source Build! Start exploring and add your reviews today.'
  },
};