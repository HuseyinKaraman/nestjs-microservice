FROM node:alpine AS development

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json
COPY apps/auth/package.json apps/auth/package.json

RUN npm install -g pnpm@10

RUN pnpm install -r --shamefully-hoist --config.confirmModulesPurge=false

COPY apps/auth apps/auth
COPY libs libs

# generate does not connect to the database, but prisma.config.ts requires DATABASE_URL
RUN cd apps/auth && DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm prisma generate

RUN pnpm -w run build auth

FROM node:alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY apps/auth/package.json apps/auth/package.json

RUN npm install -g pnpm@10

RUN pnpm install -r --prod --shamefully-hoist --config.confirmModulesPurge=false

COPY --from=development /usr/src/app/dist ./dist
COPY --from=development /usr/src/app/apps/auth/prisma.config.ts ./apps/auth/prisma.config.ts
COPY --from=development /usr/src/app/apps/auth/prisma ./apps/auth/prisma
COPY proto proto

CMD ["sh", "-c", "cd apps/auth && pnpm prisma migrate deploy && cd ../.. && node dist/apps/auth/main"]
