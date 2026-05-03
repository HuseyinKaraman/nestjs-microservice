FROM node:alpine As development

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.json

RUN pnpm install --shamefully-hoist

COPY apps/notifications ./apps/notifications
COPY libs libs

RUN cd apps/notifications && pnpm install --shamefully-hoist

RUN pnpm run build

FROM node:alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install --prod --shamefully-hoist

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/notifications/main"]