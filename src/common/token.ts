import { prismaManager } from "../../prisma/prisma.js";

async function isValidToken(token: string, origin: string): Promise<boolean> {
    const key = await prismaManager.origin.findUnique({
        where: {
            key: token,
            name: origin
        },
    });
    return !!key;
};

async function generateToken(origin: string): Promise<string> {
    const token = crypto.getRandomValues(new Uint8Array(32)).toString();

    if(!token) {
        throw new Error("Erro ao gerar token.");
    };

    if(!origin) {
        throw new Error("Origem é obrigatória para gerar token.");
    };

    const existingOrigin = await prismaManager.origin.findFirst({
        where: {
            name: origin
        },
    });

    if (!existingOrigin) {
        throw new Error("Origem não encontrada.");
    }

    await prismaManager.origin.update({
        where: {
            id: existingOrigin.id
        },
        data: {
            key: token
        }
    });
    
    return token;
};

export { isValidToken, generateToken };