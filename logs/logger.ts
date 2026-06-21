import pino from 'pino'

export const logger = pino(
  pino.destination({
    dest: './logs/app.log',
    mkdir: true,
    sync: false
  })
)