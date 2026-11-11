FROM node:24-bookworm-slim AS arena
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/lab/package.json ./apps/lab/package.json
RUN npm ci
COPY apps ./apps
COPY packages ./packages
COPY astryx-themes.ts tsconfig.json ./
COPY integrations ./integrations
RUN npm run build
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=2567
USER node
EXPOSE 2567
CMD ["npm", "start"]
