// Type the link datum as expected by react-d3-tree
type LinkDatum = {
    source: { x: number; y: number };
    target: { x: number; y: number };
  };

export const branchPathFunc = (link: LinkDatum, orientation: 'horizontal' | 'vertical'): string => {
    const { source, target } = link;

    // For simplicity we assume vertical orientation (top-down tree)
    // x = horizontal, y = vertical (increasing downward)
    if (orientation !== 'vertical') {
        // Quick fallback for horizontal — you can adapt similarly
        return `M${source.x},${source.y} L${target.x},${target.y}`;
    }

    const dx = target.x - source.x;           // horizontal offset
    const dy = target.y - source.y;           // vertical distance (should be positive)

    // Main stem: slight S-curve for organic feel
    const curveStrength = dy * 0.12;          // adjust for more/less bend
    const midY = source.y + dy * 0.4;

    let path = `M ${source.x},${source.y}
                C ${source.x},${midY - curveStrength},
                    ${target.x},${midY + curveStrength},
                    ${target.x},${target.y}`;

    // ── Add 1–2 small side branches (twigs) ──
    // Twig 1 – left side, about 30–40% down
    const twig1Y = source.y + dy * 0.35;
    const twig1X = source.x - 12;             // offset left
    path += ` M ${source.x + dx*0.2},${twig1Y}
                L ${twig1X},${twig1Y - 14}
                L ${twig1X + 6},${twig1Y - 22}`;

    // Twig 2 – right side, about 65% down
    const twig2Y = source.y + dy * 0.65;
    const twig2X = source.x + 14;
    path += ` M ${source.x + dx*0.4},${twig2Y}
                L ${twig2X},${twig2Y + 10}
                L ${twig2X - 5},${twig2Y + 18}`;

    return path.trim();
};