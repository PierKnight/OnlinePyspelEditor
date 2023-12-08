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
FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install --only=production
COPY --from=build /usr/src/app/dist dist/
COPY --from=build /usr/src/app/prisma prisma/
COPY --from=isolate /usr/src/app/isolate-1.10.1/isolate /bin/isolate
COPY isolate /usr/local/etc/isolate
RUN npx prisma generate && apk add libcap-dev && apk add python3 && apk add py3-pip && pip install pyspel && npm install -g pyright 
EXPOSE 5000
CMD ["node", "dist/main.js"]