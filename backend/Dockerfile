### STAGE 1: Build ###
FROM node:alpine AS build
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

### STAGE 2: Run ###
FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install --only=production
COPY --from=build /usr/src/app/dist dist/
COPY --from=build /usr/src/app/prisma prisma/
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "dist/main.js"]