# @eonhive/prd-packager

Build `.prd` ZIP archives from PRD (Portable Responsive Document) package directories.

## Installation

```bash
npm install @eonhive/prd-packager
# or
pnpm add @eonhive/prd-packager
```

## Usage

```typescript
import { packPRDDirectory } from '@eonhive/prd-packager';

// Pack a directory into a .prd file
await packPRDDirectory({
  sourceDir: './my-document',
  outputPath: './my-document.prd',
});
```

## Options

```typescript
interface PackOptions {
  sourceDir: string;     // Path to the PRD package directory
  outputPath: string;    // Output .prd file path
  compress?: boolean;    // Enable compression (default: true)
  includeHidden?: boolean; // Include hidden files (default: false)
}
```

## Example

```typescript
import { packPRDDirectory } from '@eonhive/prd-packager';

await packPRDDirectory({
  sourceDir: './examples/document-basic',
  outputPath: './build/document-basic.prd',
  compress: true,
});

console.log('Package created successfully!');
```

## Package Structure

The packager expects standard PRD structure:

```
my-document/
  manifest.json
  content/
  assets/
  profiles/
```

## Documentation

See [PRD Package Layout](https://github.com/eonhive/PRD/docs/core/PRD_PACKAGE_LAYOUT_DRAFT.md) for directory structure requirements.

## License

MIT
