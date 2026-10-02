# syntax=docker/dockerfile:1
# Build context: this repo with a checkout of the project's repo (containing docs.config.json) in source/.
#   docker build -t docs .

FROM node:24-trixie-slim AS build

# Checksum of the official GitHub release asset.
ARG DOXYGEN_VERSION=1.15.0
ARG DOXYGEN_TAG=Release_1_15_0
ARG DOXYGEN_SHA256=0ec2e5b2c3cd82b7106d19cb42d8466450730b8cb7a9e85af712be38bf4523a1

# git: commit id and link checks against the sparse checkout in source/.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git graphviz \
 && rm -rf /var/lib/apt/lists/* \
 && git config --system --add safe.directory '*'

RUN curl -fsSL --connect-timeout 20 --max-time 300 --retry 3 --retry-all-errors \
      -o /tmp/doxygen.tar.gz \
      "https://github.com/doxygen/doxygen/releases/download/${DOXYGEN_TAG}/doxygen-${DOXYGEN_VERSION}.linux.bin.tar.gz" \
 && echo "${DOXYGEN_SHA256}  /tmp/doxygen.tar.gz" | sha256sum -c - \
 && tar -xzf /tmp/doxygen.tar.gz -C /tmp \
 && install -m 0755 "/tmp/doxygen-${DOXYGEN_VERSION}/bin/doxygen" /usr/local/bin/doxygen \
 && rm -rf /tmp/doxygen* \
 && doxygen --version

WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .
ARG DOCS_NOINDEX=true
ENV DOCS_SOURCE=source DOCS_NOINDEX=${DOCS_NOINDEX}
RUN npm run build \
 && base="$(node --input-type=module -e "import {baseUrl} from './scripts/config.mjs'; console.log(baseUrl)")" \
 && mkdir -p "/out/html${base}" /out/conf \
 && cp -r build/. "/out/html${base}" \
 && sed "s|@BASE@|${base}|g" nginx.conf > /out/conf/default.conf \
 && mkdir -p /out/artifacts/doxygen-warnings \
 && { cp -r generated/doxygen-warnings/. /out/artifacts/doxygen-warnings/ 2>/dev/null || true; }

# CI-only: `--target artifacts --output type=local` exports build logs. Must stay above the final stage.
FROM scratch AS artifacts
COPY --from=build /out/artifacts/ /

FROM nginxinc/nginx-unprivileged:1.31.6-alpine

COPY --from=build /out/conf/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out/html/ /srv/site/

EXPOSE 8080
