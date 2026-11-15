"use client";
import { ASTROLOGERS } from "@/lib/astrologers";
import { useTypewriter } from "./useTypewriter";

type Who = keyof typeof ASTROLOGERS;

// One oracle speaking on the comm screen: portrait + name + typed line.
// `rest` is the part not typed yet: it is laid out invisibly, so the panel has its final height
// from the first letter and nothing below it jumps.
export function Comm({ who, text, typed, rest, done, children }: { who: Who; text?: string; typed?: string; rest?: string; done?: boolean; children?: React.ReactNode }) {
  const a = ASTROLOGERS[who];
  return (
    <div style={{ ["--speaker" as any]: a.color }}>
      <div className="comm">
        <div className={`portrait talking swap`} key={who}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.img} alt={a.name} />
        </div>
        <div>
          <div className="speaker">
            {a.name}
            <small>{a.title}</small>
          </div>
          <div className="say">
            {typed ?? text}
            {!done && <span className="caret" />}
            {rest ? <span className="unsaid" aria-hidden>{rest}</span> : null}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// A comm line that types itself.
export function TypedComm({ who, text, children }: { who: Who; text: string; children?: React.ReactNode }) {
  const { shown, done, skip } = useTypewriter(text);
  return (
    <div onClick={skip}>
      <Comm who={who} typed={shown} rest={text.slice(shown.length)} done={done}>
        {done && children}
      </Comm>
    </div>
  );
}
