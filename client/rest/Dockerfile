FROM ubuntu:20.04

RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && apt-get install -y build-essential \
    && node --version \
    && npm --version \
    && npm install -g yarn

WORKDIR /app
COPY . /app/catapult-rest
RUN cd catapult-rest && npm i

ARG UID=1000
RUN useradd -m -u ${UID} docker

# 作成したユーザーに切り替える
USER ${UID}
