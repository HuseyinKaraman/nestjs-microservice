FROM node:alpine As development

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json nest-cli.json ./
COPY apps/auth/package.json ./apps/auth/

RUN npm install -g pnpm@8

COPY apps/auth ./apps/auth
COPY libs libs

RUN pnpm install -r --shamefully-hoist --config.confirmModulesPurge=false

RUN pnpm run build auth

FROM node:alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY --from=development /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/dist ./dist
COPY proto proto

CMD ["node", "dist/apps/auth/main"]