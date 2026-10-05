FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Dummy URL for Prisma Client generation during build
RUN DATABASE_URL="postgresql://user:password@localhost:5432/dummy" npx prisma generate

RUN npm run build

EXPOSE 5010

CMD ["npm", "start"]