# Notification Service

Serviço HTTP para enfileirar e enviar mensagens pelo WhatsApp. As mensagens são
armazenadas em um banco SQLite com Prisma e processadas pelo cliente do WhatsApp
baseado em Baileys.

## Pré-requisitos

Antes de começar, instale:

- Node.js 20 ou superior;
- npm;
- uma conta de WhatsApp que possa ser vinculada pelo QR Code.

O SQLite é usado por meio de uma biblioteca Node.js, portanto não é necessário
instalar um servidor de banco de dados separado.

## Como rodar após clonar

### 1. Entre na pasta do projeto

```bash
cd notification-service
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Crie o arquivo `.env`

Crie um arquivo chamado `.env` na raiz do projeto:

```env
DATABASE_URL="file:./data.db"
SECRET_KEY="troque-por-uma-chave-com-pelo-menos-32-caracteres"
PORT=3012

# Opcionais: usados na transcrição de áudios recebidos
OPENAI_KEY=""
MAX_AUDIO_BYTES=26214400
```

Observações:

- `DATABASE_URL` é obrigatória e aponta para o arquivo SQLite;
- `SECRET_KEY` é obrigatória, precisa ter pelo menos 32 caracteres e será usada
  como token de acesso à API;
- `PORT` é opcional; quando omitida, a aplicação usa `3012`;
- `OPENAI_KEY` só é necessária para recursos que transcrevem áudio;
- não compartilhe nem versione o arquivo `.env` com credenciais reais.

O código também aceita as variáveis opcionais `EMAIL_HOST`, `EMAIL_PORT`,
`EMAIL_USER`, `EMAIL_WARNING`, `EMAIL_PASS`, `EMAIL_REMETENTE`, `ROOT_USER`,
`ROOT_PASSWORD` e `ROOT_EMAIL`. Elas não são necessárias para iniciar o fluxo
atual de WhatsApp.

### 4. Gere o Prisma Client

```bash
npx prisma generate
```

O client será criado em `generated/prisma`, na raiz do projeto.

### 5. Crie ou atualize o banco de dados

Para aplicar as migrations que já estão versionadas:

```bash
npx prisma migrate deploy
```

Esse comando cria o arquivo SQLite definido em `DATABASE_URL`, caso ele ainda
não exista, e aplica as migrations pendentes.

### 6. Inicie a aplicação em desenvolvimento

```bash
npm run dev
```

A API ficará disponível, por padrão, em:

```text
http://localhost:3012
```

Na primeira execução, um QR Code do WhatsApp deve aparecer no terminal. No
celular, abra **WhatsApp > Aparelhos conectados > Conectar um aparelho** e
escaneie o código. A sessão é persistida na pasta `sessions/`, então normalmente
não será necessário escanear novamente nas próximas execuções.

Mantenha esse terminal aberto enquanto estiver usando o serviço. Para encerrar,
pressione `Ctrl+C`.

## Testando a API

Todas as rotas, inclusive as de verificação, exigem o token definido em
`SECRET_KEY` no cabeçalho `Authorization`.

### Verificação de disponibilidade

```bash
curl http://localhost:3012/ping \
  -H "Authorization: Bearer troque-por-uma-chave-com-pelo-menos-32-caracteres"
```

Resposta esperada:

```text
Pong
```

### Enfileirar uma mensagem de WhatsApp

```bash
curl -X POST http://localhost:3012/whatsapp \
  -H "Authorization: Bearer troque-por-uma-chave-com-pelo-menos-32-caracteres" \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá!","phone":"5511999999999"}'
```

Campos usados nesse endpoint:

- `text`: texto da mensagem, de 1 a 500 caracteres;
- `phone`: telefone com DDI e DDD, contendo de 10 a 15 dígitos;
- `webhook`: URL opcional que receberá mensagens de retorno relacionadas ao
  número.

A requisição registra a mensagem no banco. O serviço verifica periodicamente a
fila e faz o envio quando a sessão do WhatsApp está conectada.

## Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia a API em desenvolvimento com `tsx`. |
| `npm run test:run` | Executa os testes uma vez. |
| `npm test` | Executa o Vitest em modo interativo. |
| `npm run build` | Compila o TypeScript e prepara arquivos para `dist/`. |
| `npm start` | Executa a versão compilada em `dist/server.js`. |
| `npm run whatsapp:connect` | Compila e abre o fluxo de conexão do WhatsApp. |
| `npm run whatsapp:delete-session` | Compila e remove a sessão salva do WhatsApp. |
| `npm run clear-messages` | Compila e apaga todas as mensagens do banco. |

Para forçar um novo vínculo do WhatsApp enquanto o build não estiver disponível,
pare a aplicação e remova manualmente a pasta `sessions/whatsapp-baileys`; faça
isso apenas se quiser invalidar a sessão local atual.

## Estado atual do projeto

O fluxo validado para uso local é:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

No estado atual do repositório, `npm run build` ainda falha por erros de tipagem
TypeScript no código do WhatsApp e por declarações de tipos ausentes. Por isso,
`npm start` e os scripts que começam executando o build não ficam disponíveis
até esses erros serem corrigidos.

Além disso, a suíte possui um teste de controller com uma mensagem de erro antiga:
o comportamento atual retorna os detalhes de validação do Zod. Assim,
`npm run test:run` executa quatro testes, mas um deles falha por divergência na
resposta esperada.
