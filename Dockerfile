FROM node:12.13
EXPOSE 3001

# @todo: no docker layer caching
WORKDIR /app
COPY . /app

RUN yarn --frozen-lockfile
ENV NODE_ENV=production
RUN yarn build