interface StatuteNode {
  marker: string;
  text: string;
  children?: StatuteNode[];
}

interface StatuteBlockRendererProps {
  blocks: StatuteNode[];
}

const depthPadding = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16'];

function markerId(path: string[]) {
  return `marker-${path.map((part) => part.replace(/[^a-zA-Z0-9]/g, '')).join('-').toLowerCase()}`;
}

function collectMarkers(nodes: StatuteNode[], parentPath: string[] = []): Array<{ marker: string; id: string }> {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.marker];
    const current = [{ marker: path.join(' '), id: markerId(path) }];
    return [...current, ...collectMarkers(node.children ?? [], path)];
  });
}

function MarkerTree({ nodes, parentPath = [], depth = 0 }: { nodes: StatuteNode[]; parentPath?: string[]; depth?: number }) {
  return (
    <ol className="space-y-3">
      {nodes.map((node) => {
        const path = [...parentPath, node.marker];
        const id = markerId(path);
        return (
          <li key={id} id={id} className={`${depthPadding[Math.min(depth, depthPadding.length - 1)]} scroll-mt-24`}>
            <p className="text-sm leading-6 text-slate-800">
              <span className="mr-2 font-semibold text-slate-900">{node.marker}</span>
              {node.text}
            </p>
            {node.children && node.children.length > 0 ? <MarkerTree nodes={node.children} parentPath={path} depth={depth + 1} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function StatuteBlockRenderer({ blocks }: StatuteBlockRendererProps) {
  const quickJumps = collectMarkers(blocks);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-20 lg:h-fit">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Jump</p>
        <ul className="max-h-64 space-y-1 overflow-auto text-sm">
          {quickJumps.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="text-blue-700 hover:underline">
                {item.marker}
              </a>
            </li>
          ))}
        </ul>
      </aside>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <MarkerTree nodes={blocks} />
      </section>
    </div>
  );
}
