FROM node:alpine As development


WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json

RUN npm install -g pnpm

COPY apps/reservations ./apps/reservations
COPY libs libs

RUN pnpm install -r --shamefully-hoist --config.confirmModulesPurge=false

RUN pnpm run build reservations

FROM node:alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install --prod --shamefully-hoist

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/reservations/main"]