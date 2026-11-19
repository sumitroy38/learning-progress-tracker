// Prints a long random text, to use as SESSION_SECRET in server/.env
//
//   npm run secret
//
// Nothing is saved or sent anywhere. Copy the text from the terminal into your .env file.
const crypto = require('crypto');

console.log(crypto.randomBytes(32).toString('hex'));
