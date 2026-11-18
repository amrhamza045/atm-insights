import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function TreemapCell({ x, y, width, height, index, name, revenue }) {
  const fill = COLORS[index % COLORS.length];
  const showLabel = width > 60 && height > 30;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} rx={3} />
      {showLabel && (
        <>
          <text x={x + width / 2} y={y + height / 2 - (height > 45 ? 6 : 0)} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
            {name}
          </text>
          {height > 45 && (
            <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="#fff" fontSize={10}>
              {formatCurrency(revenue)}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export default function CategoryTreemap({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap
        data={data}
        dataKey="revenue"
        nameKey="name"
        content={<TreemapCell />}
        isAnimationActive={false}
      >
        <Tooltip formatter={(value) => formatCurrency(value)} />
      </Treemap>
    </ResponsiveContainer>
  );
}