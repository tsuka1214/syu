#!/bin/bash
set -e
pnpm install --frozen-lockfile --config.allow-build=esbuild
pnpm --filter db push
