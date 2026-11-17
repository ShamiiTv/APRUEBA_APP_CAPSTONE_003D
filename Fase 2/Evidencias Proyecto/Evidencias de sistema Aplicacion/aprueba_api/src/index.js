import 'dotenv/config';
import {createApp} from './app.js';
const app=createApp();
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log(`API en http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
