FROM node:slim AS app

ARG PORT=3000
ARG DATABASE_URL=file:./cache.db

WORKDIR /app

COPY package*.json .

RUN npm install
RUN npm install -g typescript

COPY . .

EXPOSE $PORT

CMD ["npm", "run", "build"]
