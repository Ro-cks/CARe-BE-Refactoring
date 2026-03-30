# Build stage - React 빌드
FROM node:20-alpine AS build

WORKDIR /app

COPY company/package*.json ./
RUN npm install

COPY company/ .
RUN npm run build

# Export stage - 빌드 결과물을 Jenkins가 호스트로 복사
FROM alpine
COPY --from=build /app/dist /tmp/dist
