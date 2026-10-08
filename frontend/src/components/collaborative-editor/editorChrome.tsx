import React from "react";

export function Tool({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "ficct-word-tool active" : "ficct-word-tool"}
    >
      {children}
    </button>
  );
}

export function RibbonGroup({ label, children, show = true }: { label: string; children: React.ReactNode; show?: boolean }) {
  if (!show) return null;
  return (
    <div className="ficct-word-ribbon-group">
      <div className="ficct-word-ribbon-group-body">{children}</div>
      <span>{label}</span>
    </div>
  );
}
