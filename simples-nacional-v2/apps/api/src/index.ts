import { buildApp } from "./rotas.js";
import { fecharDb } from "./db.js";

const porta = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const app = buildApp();
  try {
    await app.listen({ port: porta, host: "0.0.0.0" });
  } catch (e) {
    app.log.error(e);
    await fecharDb();
    process.exit(1);
  }
}

void main();
