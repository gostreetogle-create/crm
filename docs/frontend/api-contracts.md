# API contracts (frontend side)

## Material-geometry

### Endpoint

- `GET /material-geometry/model`

### Response shape

```json
{
  "version": "0.1",
  "materialFields": [
    {
      "key": "id",
      "label": "Идентификатор",
      "type": "uuid",
      "required": true,
      "comment": "PK"
    }
  ],
  "geometryFields": [
    {
      "key": "shapeKey",
      "label": "Тип геометрии",
      "type": "string",
      "required": true,
      "comment": "rectangular/cylindrical/tube/plate/custom"
    }
  ]
}
```

TypeScript contract:
- `crm-web/src/app/features/material-geometry/model/material-geometry-model.ts`

## Switching mock -> http

File:
- `crm-web/src/app/core/api/api-config.ts`

Set:
- `useMockRepositories: false`
- `baseUrl: 'http://localhost:3000'` (or your backend URL)

Operational runbook:
- `docs/frontend/backend-enable-runbook.md`

