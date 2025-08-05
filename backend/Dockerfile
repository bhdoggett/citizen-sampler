WORKDIR /app

COPY package*.json ./
RUN npm install

COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend

RUN npm run build
