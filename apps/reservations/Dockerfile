FROM node:alpine As development

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --shamefully-hoist

COPY . .

RUN pnpm run build

FROM node:alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --shamefully-hoist

COPY . .

COPY --from=development /usr/src/app/dist ./dist


CMD ["node", "dist/apps/reservations/main"]