import { useNavigate } from "react-router-dom";
import type { Template } from "@drawer/template-engine";

const difficultyLabel: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const difficultyColor: Record<string, string> = {
  easy: "#4CAF50",
  medium: "#FF9800",
  hard: "#F44336",
};

export default function TemplateCard({ template }: { template: Template }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/editor/${template.id}`)}
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        background: "#fff",
      }}
    >
      <div
        style={{
          height: 140,
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={80}
          height={80}
          viewBox={
            template.viewBox
              ? `${template.viewBox.x} ${template.viewBox.y} ${template.viewBox.w} ${template.viewBox.h}`
              : "0 0 400 400"
          }
        >
          {template.regions.slice(0, 10).map((r) => (
            <path
              key={r.id}
              d={r.path}
              fill="#ddd"
              stroke="#ccc"
              strokeWidth={1}
            />
          ))}
        </svg>
      </div>
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{template.name}</div>
        <span
          style={{
            fontSize: 12,
            color: "#fff",
            background: difficultyColor[template.difficulty],
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {difficultyLabel[template.difficulty]}
        </span>
      </div>
    </div>
  );
}
