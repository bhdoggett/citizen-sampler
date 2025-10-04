FROM node:18

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend ./backend

WORKDIR /app/backend

RUN npm run build

CMD ["node", "dist/index.js"]