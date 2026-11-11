FROM node:24

WORKDIR /app

# Install all workspaces from the single root lockfile (better layer cache)
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
