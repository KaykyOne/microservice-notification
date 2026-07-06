---
name: import-organization
description: Organize JavaScript and TypeScript imports using project category comments such as Package, Node, Service, Route, Controller, Util, Schema, Prisma, Infra, Common, Config, Tool, and App. Use when the user asks to organize imports, padronizar imports, ajustar blocos de import, or apply the project's import grouping style across files.
---

# Import Organization

Use this skill to organize imports in project files while preserving runtime behavior.

## Workflow

1. Inspect the target file or the user's reference file to identify the local import style.
2. Group imports by category and place a `//* ... Import(s)` comment immediately before each category.
3. Keep one blank line between import groups.
4. Do not change imported symbols, paths, aliases, side-effect imports, or runtime order when order may matter.
5. Exclude generated files unless the user explicitly asks to edit them.
6. Run the project build or TypeScript check when available.

## Comment Naming

Use singular or plural based on how many import statements are in that category:

- One import statement in the category: `//* Package Import`
- Two or more import statements in the category: `//* Package Imports`

Count import statements, not imported members. This is singular because there is one statement:

```ts
//* Service Import
import {
    sendMessageService,
    start,
} from "../services/whatsapp.service.js";
```

This is plural because there are multiple statements in the same category:

```ts
//* Common Imports
import { tempoHumano, iniciadorAleatorio } from "../../common/humanization.js";
import { formatNumber, clearNumber } from "../../common/number.js";
```

## Category Guide

- `Package`: external dependencies from `node_modules`.
- `Node`: built-in Node modules such as `node:fs`, `fs/promises`, `path`, or `child_process`.
- `Config`: environment setup, config files, or app config modules.
- `Prisma`: Prisma client, adapters, or database manager imports.
- `App`: application entrypoint imports.
- `Route`: route modules.
- `Controller`: controller modules.
- `Service`: service modules.
- `Middleware`: middleware modules.
- `Infra`: infrastructure modules.
- `Whatsapp`: WhatsApp-specific infrastructure modules.
- `Email`: email-specific infrastructure modules.
- `Common`: shared domain helpers from common folders.
- `Util`: utility modules such as loggers.
- `Schema`: schema, DTO, validation, or type-definition modules.
- `Tool`: local tools or scripts imported by runtime code.

Prefer the category name that matches the project's existing folder/layer vocabulary. If a category does not exist yet but is clearly needed, create the smallest clear category name.

## Ordering

Prefer this order when the project has no stronger local convention:

1. Config side-effect imports
2. Package imports
3. Node imports
4. Prisma imports
5. App, route, controller, service, middleware imports
6. Infra imports
7. Common imports
8. Util imports
9. Schema imports
10. Tool imports

For side-effect imports such as `import "dotenv/config";`, keep them before code that depends on the side effect.
