import { randomBytes } from 'node:crypto';

const accessSecret = randomBytes(64).toString('hex');
const refreshSecret = randomBytes(64).toString('hex');

console.log('Generated JWT secrets:\n');
console.log(`JWT_SECRET=${accessSecret}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecret}`);
