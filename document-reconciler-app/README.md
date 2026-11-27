# Document Reconciler

Standalone browser-only app published at `https://apps.sbisif.com/document-reconciler/`.

## Local development

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://localhost:5174/document-reconciler/`. Run the portal and
Compliance Guard from the Compliance Guard workspace on port 5173 to test all
three routes locally.

The app parses documents and stores custom frameworks and review state in the
browser. It does not send documents to a server.

## Production build

```sh
npm run build
```

The Apps Portal GitHub Pages workflow builds this project and publishes its
output under `/document-reconciler/`.
