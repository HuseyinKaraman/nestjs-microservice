FROM node:alpine As development

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

FROM node:alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json ./

RUN pnpm install --prod

COPY . .

COPY --from=development /usr/src/app/dist ./dist


CMD ["node", "dist/apps/auth/main"]