FROM node:23.11.0-slim

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y git build-essential

WORKDIR /app

COPY . .

RUN npm install -g pnpm@10.5.0 && pnpm install

RUN pnpm prisma generate

RUN pnpm build

CMD ["pnpm", "start"]
