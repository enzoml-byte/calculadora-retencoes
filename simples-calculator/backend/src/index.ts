import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes';

const app = Fastify({ logger: true });

async function start() {
  try {
    await app.register(cors, { origin: true });
    await app.register(multipart, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    });

    await registerRoutes(app);

    const port = Number(process.env.PORT) || 3001;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend rodando em http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();