FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs data ./data
COPY --chown=nextjs:nodejs migrations ./migrations
COPY --chown=nextjs:nodejs server ./server
COPY --chown=nextjs:nodejs server.js ./

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
