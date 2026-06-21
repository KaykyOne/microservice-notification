import pino from 'pino'

export const logger = pino(
  pino.destination({
    dest: './',
    mkdir: true,
    sync: false
  })
)