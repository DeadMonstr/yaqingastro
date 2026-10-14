import { loadConfig } from './config.js'
import { buildApp } from './app.js'

const config = loadConfig()
const app = await buildApp(config)

try {
  await app.listen({ host: config.host, port: config.port })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// В контейнере node — PID 1 и на SIGTERM сам не завершается: без обработчика `docker stop`
// ждёт 10 секунд и убивает процесс, а база не закрывается.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, async () => {
    try {
      await app.close()
      process.exit(0)
    } catch (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
}
