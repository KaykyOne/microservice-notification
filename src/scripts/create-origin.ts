import { prismaManager } from '../../prisma/prisma.js';
import crypto from 'node:crypto';

async function main() {

    const name = process.argv[2]
    const webhook = process.argv[3]

    if (!name || !webhook) {
        console.log('Uso: npm run create-origin -- "Meu App" "https://meu-webhook.com"')
        process.exit(1)
    }

    const key = crypto.randomBytes(32).toString('hex')

    const origin = await prismaManager.origin.create({
        data: {
            name,
            webhook,
            key,
        },
    })

    console.log('Origin criada:')
    console.log({
        id: origin.id,
        name: origin.name,
        webhook: origin.webhook,
        key: origin.key,
    })
}

main()
    .catch(console.error)
    .finally(() => prismaManager.$disconnect())