# @eonhive/prd-validator

Validate PRD (Portable Responsive Document) package structure, manifest, and profile content against the PRD specification.

## Installation

```bash
npm install @eonhive/prd-validator
# or
pnpm add @eonhive/prd-validator
```

## Usage

### Node.js

```typescript
import { validatePRDPackage } from '@eonhive/prd-validator/node';

const result = await validatePRDPackage('./my-document.prd');
if (result.valid) {
  console.log('Package is valid!');
} else {
  console.error('Validation errors:', result.errors);
}
```

### Browser

```typescript
import { validatePRDPackage } from '@eonhive/prd-validator/browser';

const result = await validatePRDPackage(prdsFile);
```

## Features

- Manifest structure validation
- Profile compliance checking
- Content schema validation
- Asset reference verification
- Detailed error reporting

## Error Handling

```typescript
const result = await validatePRDPackage(packagePath);
result.errors?.forEach(error => {
  console.log(`${error.path}: ${error.message}`);
});
```

## Documentation

See [PRD Specification](https://github.com/eonhive/PRD/docs/foundation/04_PRD/PRD_FOUNDATION.md) for detailed format requirements.

## License

MIT
