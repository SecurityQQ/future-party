import type { ReactNode } from "react";

// A beveled steel panel with an engraved title strip.
export default function Hull({ title, code, led = "green", children, className }: { title?: ReactNode; code?: ReactNode; led?: "green" | "amber" | "red"; children: ReactNode; className?: string }) {
  return (
    <section className={`hull ${className ?? ""}`}>
      <div className="hull-in">
        {title && (
          <header className="hull-head">
            <span className={`led ${led === "green" ? "" : led}`} />
            <span className="grow">{title}</span>
            {code && <span className="code">{code}</span>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
