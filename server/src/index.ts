import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { ensureAdmin } from './services/bootstrap';
import { runnerHealthy } from './services/runnerClient';
import { Track } from './models';

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
  await ensureAdmin();

  if ((await Track.countDocuments()) === 0) {
    console.warn('WARNING: no curriculum in the database yet. Run `npm run seed` in server/.');
  }
  if (!(await runnerHealthy())) {
    console.warn('WARNING: the code runner is not reachable. Practice runs will fail until it is up.');
  }

  const app = createApp();
  app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
