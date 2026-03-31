FROM node:24

WORKDIR /app

# Copiar package.json primero (mejora cache)
COPY package*.json ./

RUN npm install

# Copiar el resto del código
COPY . .

EXPOSE 3001

CMD ["npm", "start"]