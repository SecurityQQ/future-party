import type { PublicCard } from "@/lib/db";
import { CharacterCard } from "./CharacterCard";

// Your own Kin, alive (its H3 clip plays over the picture), with the picture and the clip to save to the phone.
export default function MyCharacter({ card, children }: { card: PublicCard; children?: React.ReactNode }) {
  return (
    <>
      <CharacterCard card={card} />
      <SaveKin card={card} />
      {children}
    </>
  );
}

// The picture is one of the app's own files (public/app/kin/), saved with the download attribute. The clips
// live on varg's CDN, which cannot hand a file over as a download, so /api/players/<id>/clip does; a clip
// kept in public/app/kin/ is saved like the picture.
function SaveKin({ card }: { card: PublicCard }) {
  if (!card.image_url) return null;
  const name = `${card.character}-${String(card.card_no).padStart(3, "0")}`.replace(/[^\p{L}\p{N}]+/gu, "-");
  const clip = card.video_url;
  const local = clip?.startsWith("/");
  return (
    <div className={`btns ${clip ? "two" : ""}`}>
      <a className="btn ghost small" href={card.image_url} download={`${name}.webp`}>Save picture</a>
      {clip && (
        <a className="btn ghost small" href={local ? clip : `/api/players/${card.id}/clip`} download={local ? `${name}.mp4` : undefined}>Save video</a>
      )}
    </div>
  );
}
