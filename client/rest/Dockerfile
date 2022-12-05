FROM node:16

WORKDIR /app
COPY . .
RUN npm uninstall . && rm -rf node_modules && npm install
RUN node --version && npm --version
EXPOSE 3000
