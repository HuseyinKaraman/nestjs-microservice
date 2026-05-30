FROM node:alpine As development

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json nest-cli.json ./
COPY apps/notifications/package.json ./apps/notifications/

RUN npm install -g pnpm@8

COPY apps/notifications ./apps/notifications
COPY libs libs

RUN pnpm install -r --shamefully-hoist --config.confirmModulesPurge=false

RUN pnpm run build notifications

FROM node:alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY --from=development /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/notifications/main"]