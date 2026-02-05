import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables before running tests
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), quiet: true });
