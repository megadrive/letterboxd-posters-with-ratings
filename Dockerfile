FROM node:slim AS app

ARG DATABASE_URL=file:./cache.db

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json .

RUN npm install
RUN npm install -g typescript

COPY . .

EXPOSE $PORT

CMD ["npm", "run", "build"]
