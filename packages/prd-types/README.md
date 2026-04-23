# @eonhive/prd-types

Shared TypeScript types and interfaces for Portable Responsive Document (PRD) tooling.

## Installation

```bash
npm install @eonhive/prd-types
# or
pnpm add @eonhive/prd-types
```

## Usage

```typescript
import {
  PRDManifest,
  PRDProfile,
  PRDContent,
} from '@eonhive/prd-types';

const manifest: PRDManifest = {
  prdVersion: '1.0',
  manifestVersion: '1.0',
  id: 'my-document',
  profile: 'general-document',
  title: 'My Document',
  entry: 'content/root.json',
};
```

## Types

- `PRDManifest` - Root manifest structure
- `PRDProfile` - Profile definitions
- `PRDContent` - Content models
- `PRDLocalization` - Localization metadata
- `PRDIdentity` - Identity and reference data

## Documentation

See [PRD Documentation](https://github.com/eonhive/PRD/docs) for format specifications and detailed type information.

## License

MIT
