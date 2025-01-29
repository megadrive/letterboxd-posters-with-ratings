FROM node:slim AS app

WORKDIR /app

COPY package*.json .

RUN npm install
RUN npm install -g typescript

COPY . .

EXPOSE $PORT

CMD ["npm", "run", "build"]
