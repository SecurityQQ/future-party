import type { Profile } from "@/lib/db";
import { LINKS, linkText } from "@/lib/profile";
import Hull from "./Hull";

export function hasProfile(p: Profile): boolean {
  return !!(p.bio || p.ask_me || LINKS.some((l) => p.links?.[l.key]));
}

// A traveler's line about themselves, what to ask them about, and their links.
export function ProfileDetails({ profile }: { profile: Profile }) {
  const links = LINKS.filter((l) => profile.links?.[l.key]);
  return (
    <div className="profile">
      {profile.bio && <p className="bio">{profile.bio}</p>}
      {profile.ask_me && (
        <p className="ask">
          <span>Ask me about</span>
          {profile.ask_me}
        </p>
      )}
      {links.length > 0 && (
        <div className="chips">
          {links.map((l) => (
            <a key={l.key} className="chip" href={profile.links[l.key]} target="_blank" rel="noopener noreferrer nofollow">
              <small>{l.label}</small>
              {linkText(l.key, profile.links[l.key]!)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// On someone's card page. Renders nothing when they left the profile empty.
export default function ProfileBlock({ name, profile }: { name: string; profile: Profile }) {
  if (!hasProfile(profile)) return null;
  return (
    <Hull title={`About ${name.split(" ")[0]}`}>
      <ProfileDetails profile={profile} />
    </Hull>
  );
}
