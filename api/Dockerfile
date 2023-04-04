FROM node:18-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY ./api .
WORKDIR /usr/src/app
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start"]