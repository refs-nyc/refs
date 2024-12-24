FROM node:22-alpine

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3333
EXPOSE 3334

CMD ["npm", "run", "server"]

# TODO: RUN MIGRATIONS ON LOCAL PB AND START EDITING
