import MerfolkEditor from '/dist/lib/index.es.js';
import '/dist/merfolk-editor.css';

const container = document.getElementById('merfolk-embed');
const statusEl = document.getElementById('demo-status');
const previewEl = document.getElementById('code-preview');

const initialCode = `flowchart TB
  Start([Kickoff]) --> Spec{Spec ready?}
  Spec -- yes --> Build[Build embed]
  Spec -- no --> Draft[Draft notes]
  Build --> Review[Review]
  Review --> Ship{Ship?}
  Ship -- yes --> Done([Release])
  Ship -- no --> Iterate[Iterate]
  Draft --> Spec
`;

if (!container || !statusEl || !previewEl) {
  throw new Error('Demo container not found');
}

previewEl.textContent = initialCode;

const editor = new MerfolkEditor(container, {
  initialCode,
  onCodeChange: (code, meta) => {
    statusEl.textContent = `${meta.source} @ ${new Date().toLocaleTimeString()}`;
    previewEl.textContent = code;
  },
});

window.addEventListener('beforeunload', () => {
  editor.destroy();
});
