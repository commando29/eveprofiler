FROM node:18-alpine
RUN mkdir -p /usr/src/app/api
WORKDIR /usr/src/app/api
COPY . .
WORKDIR /usr/src/app/api
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start"]