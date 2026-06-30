import z from 'zod';

const EnvSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.string().optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_WARNING: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_REMETENTE: z.string().optional(),
    ROOT_USER: z.string().optional(),
    ROOT_PASSWORD: z.string().optional(),
    ROOT_EMAIL: z.string().optional(),
})


const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,

    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_WARNING: process.env.EMAIL_WARNING,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_REMETENTE: process.env.EMAIL_REMETENTE,

    ROOT_USER: process.env.ROOT_USER,
    ROOT_PASSWORD: process.env.ROOT_PASSWORD,
    ROOT_EMAIL: process.env.ROOT_EMAIL,
}

const parsedEnv = EnvSchema.safeParse(env);

if (!parsedEnv.success) {
    console.error("Erro ao validar variáveis de ambiente:", parsedEnv.error.format());
    process.exit(1);
}

export default parsedEnv.data;
