# Document Reconciler

Standalone browser-only app published at `https://apps.sbisif.com/document-reconciler/`.

## Local development

```sh
npm ci
npm run dev
```

The app parses documents and stores custom frameworks and review state in the
browser. It does not send documents to a server.

## Production build

```sh
npm run build
```

The Apps Portal GitHub Pages workflow builds this project and publishes its
output under `/document-reconciler/`.
