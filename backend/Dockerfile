### STAGE 1: Build ###
FROM node:alpine AS build
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:alpine AS isolate
WORKDIR /usr/src/app
RUN apk add build-base libcap-dev
ADD https://github.com/ioi/isolate/archive/refs/tags/v1.10.1.tar.gz isolate.tar.gz
RUN tar -oxzf isolate.tar.gz && make -C isolate-1.10.1 isolate

### STAGE 2: Run ###
FROM python:3.10-alpine
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist dist/
COPY --from=build /usr/src/app/prisma prisma/
COPY --from=isolate /usr/src/app/isolate-1.10.1/isolate /bin/isolate
COPY isolate /usr/local/etc/isolate
RUN apk add --update nodejs npm && apk add clingo && apk add libcap-dev && pip install pyspel && npm install -g pyright 
COPY package*.json .
RUN npm install --only=production && npx prisma generate
EXPOSE 5000
CMD ["node", "dist/main.js"]