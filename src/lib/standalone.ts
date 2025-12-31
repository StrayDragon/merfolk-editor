import MerfolkEditor, { Editor, InteractiveCanvas, SyncEngine } from './index';

const standalone = MerfolkEditor as typeof MerfolkEditor & {
  SyncEngine: typeof SyncEngine;
  Editor: typeof Editor;
  InteractiveCanvas: typeof InteractiveCanvas;
};

standalone.SyncEngine = SyncEngine;
standalone.Editor = Editor;
standalone.InteractiveCanvas = InteractiveCanvas;

export default standalone;
