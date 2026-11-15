import Link from "next/link";
import type { PublicCard } from "@/lib/db";
import { ELEMENT_ICON, GLYPH } from "@/lib/zodiac";
import { cardClass, finishLabel as finish } from "@/lib/finish";

const pad = (n: number) => String(n).padStart(3, "0");

// The collectible card. The element sets the frame color; see-through finishes get a holo sheen.
export function CharacterCard({ card, reveal, children }: { card: PublicCard; reveal?: boolean; children?: React.ReactNode }) {
  return (
    <article className={`card ${cardClass(card)} ${reveal ? "reveal" : ""}`}>
      <div className="card-in">
        <div className="card-top">
          <span>№ {pad(card.card_no)}</span>
          <span className="glyph" title={card.sign}>{GLYPH[card.sign]}</span>
          <span>{card.sign.toUpperCase()}</span>
        </div>
        <div className="card-art">
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image_url} alt={`${card.character}, the character of ${card.name}`} />
          ) : (
            <div className="materializing">
              <div>
                <div className="big">{GLYPH[card.sign]}</div>
                <div>{card.status === "failed" ? "Signal lost" : "Materializing"}</div>
              </div>
            </div>
          )}
        </div>
        <h2 className="card-name">{card.character}</h2>
        <p className="card-owner">
          Traveler <b>{card.name}</b>
        </p>
        <div className="card-stats">
          <div className="stat"><b>{ELEMENT_ICON[card.element]} {card.element}</b><span>element</span></div>
          <div className="stat"><b>{finish(card.style)}</b><span>finish</span></div>
          <div className="stat"><b>×{card.collected_by ?? 0}</b><span>collected</span></div>
        </div>
        {card.prophecy && <p className="card-prophecy">“{card.prophecy}”</p>}
        {children}
      </div>
    </article>
  );
}

export function MiniCard({ card, href }: { card: PublicCard; href?: string }) {
  return (
    <Link className={`mini ${cardClass(card)}`} href={href ?? `/app/c/${card.card_no}`}>
      <div className="mini-in">
        <div className="art">
          <span className="n">№{pad(card.card_no)}</span>
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image_url} alt={card.character} loading="lazy" />
          ) : (
            <div className="materializing"><div><div className="big" style={{ fontSize: 34 }}>{GLYPH[card.sign]}</div></div></div>
          )}
        </div>
        <div className="t">{card.character}</div>
        <div className="o">{card.name}</div>
      </div>
    </Link>
  );
}
