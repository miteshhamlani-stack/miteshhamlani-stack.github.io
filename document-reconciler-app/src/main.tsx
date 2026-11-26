import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DocumentReconcilerWorkbench } from './modules/document-reconciler/DocumentReconcilerWorkbench'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DocumentReconcilerWorkbench />
  </StrictMode>,
)
