-- Zodiac Rangers: schema. Idempotent: safe to run again.
-- Run: set -a; source .env.local; set +a; psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Every table has row level security on and no policies, so the publishable (anon) key
-- cannot read or write anything. The app server uses the secret key, which bypasses RLS.

create extension if not exists pgcrypto;

-- The guest list (from Future_Party_Guests.xlsx, translated to English prompt text).
create table if not exists guests (
  id          serial primary key,
  key         text not null unique, -- "<rsvp>-<name slug>": stable id for re-imports
  rsvp        int,
  name        text not null,
  hint        text,                 -- shown when two guests share a name ("with Ivan Tert")
  aliases     text[] not null default '{}',
  role        text not null default 'guest',
  character   text,                 -- "Toucan Showman"
  subject     text,                 -- English subject for the image prompt
  scene       text,                 -- English setting for the image prompt
  tone        text not null default 'mid',
  topics      text[] not null default '{}',
  totem_ru    text,
  scene_ru    text,
  created_at  timestamptz not null default now()
);

-- A pilot: one person with a character. Created the first time a device registers.
create table if not exists players (
  id             uuid primary key default gen_random_uuid(),
  card_no        serial,
  name           text not null,
  birthday       date not null,
  sign           text not null,
  element        text not null,
  guest_id       int references guests(id) on delete set null,
  match_score    real,
  character      text not null,     -- character title shown on the card
  subject        text not null,
  scene          text,
  style          text not null,     -- finish id from presets.styles
  rarity         text not null,     -- common | rare | epic | legendary
  prompt         text,
  model          text,
  job_id         text,
  attempts       int not null default 0,
  status         text not null default 'pending',  -- pending | generating | finalizing | done | failed
  error          text,
  image_url      text,
  source_url     text,
  reading        text,
  prophecy       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists players_status_idx on players(status);

-- Device sessions: the httpOnly cookie holds the token.
create table if not exists sessions (
  token       text primary key,
  player_id   uuid not null references players(id) on delete cascade,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_player_idx on sessions(player_id);

-- RFID / NFC tags. The tag URL is /t/<code>. A tag belongs to the first pilot who claims it.
create table if not exists tags (
  code        text primary key,
  player_id   uuid unique references players(id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Who collected whose character (one row per pair).
create table if not exists collections (
  collector_id  uuid not null references players(id) on delete cascade,
  owner_id      uuid not null references players(id) on delete cascade,
  tag_code      text,
  created_at    timestamptz not null default now(),
  primary key (collector_id, owner_id),
  check (collector_id <> owner_id)
);
create index if not exists collections_owner_idx on collections(owner_id);

-- Every scan, for the record.
create table if not exists scans (
  id          bigserial primary key,
  tag_code    text not null,
  player_id   uuid references players(id) on delete set null,
  kind        text not null,        -- new | claim | own | collect | repeat | visitor | busy
  created_at  timestamptz not null default now()
);
create index if not exists scans_player_idx on scans(player_id);

-- Email login, profiles and the onboarding redraw (added 2026-11-14). Additive, safe on a live database.
alter table players add column if not exists email          text;
alter table players add column if not exists bio            text;
alter table players add column if not exists ask_me         text;
alter table players add column if not exists links          jsonb not null default '{}'::jsonb; -- {instagram, telegram, x, linkedin, website}
alter table players add column if not exists redraws        int not null default 0;            -- one redraw with feedback
alter table players add column if not exists feedback       text;                              -- what the guest asked to change
alter table players add column if not exists prev_image_url text;                              -- the other version, to switch back
create unique index if not exists players_email_idx on players (lower(email)) where email is not null;

-- One-time login codes sent by email. Only a keyed hash of the code is kept.
create table if not exists login_codes (
  id          bigserial primary key,
  player_id   uuid not null references players(id) on delete cascade,
  email       text not null,
  code_hash   text not null,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists login_codes_email_idx on login_codes (email, created_at desc);

-- Friends: mutual, one row per direction. Kept apart from collections, so a shared link never
-- counts on the ranking; only scanning a card does.
create table if not exists friends (
  player_id   uuid not null references players(id) on delete cascade,
  friend_id   uuid not null references players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (player_id, friend_id),
  check (player_id <> friend_id)
);
create index if not exists friends_friend_idx on friends(friend_id);

-- Kin clips (added 2026-11-15): every finished picture is animated once with MiniMax H3 (image to
-- video, lib/video.ts). One row per picture, so a redraw or a switch between versions never loses
-- or repeats a clip. players.video_url is the clip of the picture now on the card. Additive.
alter table players add column if not exists video_url text;
create table if not exists videos (
  image_url   text primary key,                  -- the stored Kin picture the clip animates
  player_id   uuid not null references players(id) on delete cascade,
  model       text not null,
  prompt      text,
  job_id      text,
  attempts    int not null default 0,
  status      text not null default 'starting',  -- starting | retry | generating | finalizing | done | failed
  error       text,
  video_url   text,                              -- the MP4 on varg's CDN (s3.varg.ai)
  source_url  text,                              -- varg's original file
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists videos_player_idx on videos(player_id);

-- Ranking: unique cards collected (the "scans" that count), raw scans, times collected by others.
create or replace view leaderboard with (security_invoker = true) as
select
  p.id, p.card_no, p.name, p.character, p.sign, p.element, p.rarity, p.style, p.status, p.image_url, p.created_at,
  coalesce(c.n, 0)::int  as collected,
  coalesce(s.n, 0)::int  as scans,
  coalesce(o.n, 0)::int  as collected_by,
  c.last_at              as last_collect_at
from players p
left join (select collector_id, count(*) n, max(created_at) last_at from collections group by collector_id) c on c.collector_id = p.id
left join (select player_id, count(*) n from scans where kind in ('collect', 'repeat') group by player_id) s on s.player_id = p.id
left join (select owner_id, count(*) n from collections group by owner_id) o on o.owner_id = p.id;

alter table guests      enable row level security;
alter table players     enable row level security;
alter table sessions    enable row level security;
alter table tags        enable row level security;
alter table collections enable row level security;
alter table scans       enable row level security;
alter table login_codes enable row level security;
alter table friends     enable row level security;
alter table videos      enable row level security;

revoke all on guests, players, sessions, tags, collections, scans, login_codes, friends, videos, leaderboard from anon, authenticated;

-- The app server uses the secret key (service_role). Grant it explicitly: newer Supabase projects
-- no longer grant new tables to it by default.
grant usage on schema public to service_role;
grant select, insert, update, delete on guests, players, sessions, tags, collections, scans, login_codes, friends, videos to service_role;
grant select on leaderboard to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Character images and their clips (MP4, ~2.5 MB each): public bucket, written only by the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('characters', 'characters', true, 52428800, array['image/webp', 'image/png', 'image/jpeg', 'video/mp4'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
