-- ============================================================
-- STW Calendar — schema, security, and seed. Run once in the
-- Supabase SQL editor. Safe to re-run on a fresh project only.
-- ============================================================

-- ── taxonomy: everything the attendee app renders as a label ──
create table categories (
  key   text primary key,
  name  text not null,
  color text not null,
  sort  int  not null default 0
);

create table app_settings (          -- flags + screen copy as KV
  key   text primary key,
  value jsonb not null
);

create table glossary (
  id         bigint generated always as identity primary key,
  term       text not null,
  definition text not null,
  sort       int  not null default 0
);

-- ── events: one table, write side and read side ──
create table events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  status        text not null default 'in_review'
                check (status in ('draft','in_review','published','declined')),
  title         text not null,
  description   text,
  category      text not null references categories(key),
  day           date not null,
  start_time    text,
  slot          text check (slot in ('Morning','Afternoon','Evening')),
  venue_name    text,
  neighborhood  text,
  access_notes  text,
  is_virtual    boolean not null default false,
  luma_url      text,
  image_url     text,          -- event cover pulled from the Luma page
  is_free       boolean not null default true,
  price         text,
  newcomer      boolean not null default false,
  step_free     boolean,
  host_name     text,
  host_org      text,
  host_email    text,
  host_phone    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  -- the rule that matters: a published event without a Luma link
  -- wastes the click. Impossible here, not just discouraged in UI.
  constraint published_needs_luma
    check (status <> 'published' or luma_url is not null)
);

-- ── click tracker: the only demand signal we own ──
create table link_clicks (
  id         bigint generated always as identity primary key,
  event_id   uuid not null references events(id) on delete cascade,
  src        text,                   -- calendar | detail | home | start_here | my_week
  clicked_at timestamptz not null default now(),
  referrer   text,
  user_agent text
);

-- ── email capture ──
create table subscribers (
  email         text primary key,
  wants_updates boolean not null default false,
  created_at    timestamptz not null default now()
);

create table saved_events (
  email    text not null references subscribers(email) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (email, event_id)
);

-- ── admin allowlist: adding a teammate = adding a row ──
create table admins ( email text primary key );

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where email = auth.jwt()->>'email') $$;

-- ── row-level security ──
alter table categories    enable row level security;
alter table app_settings  enable row level security;
alter table glossary      enable row level security;
alter table events        enable row level security;
alter table link_clicks   enable row level security;
alter table subscribers   enable row level security;
alter table saved_events  enable row level security;
alter table admins        enable row level security;

-- labels are public reading, admin writing
create policy "labels are public"    on categories   for select using (true);
create policy "labels admin write"   on categories   for all    using (is_admin());
create policy "settings are public"  on app_settings for select using (true);
create policy "settings admin write" on app_settings for all    using (is_admin());
create policy "glossary is public"   on glossary     for select using (true);
create policy "glossary admin write" on glossary     for all    using (is_admin());

-- events: the world reads published, hosts submit, admins do everything
create policy "published events are public" on events for select
  using (status = 'published' or is_admin());
create policy "anyone can submit for review" on events for insert
  with check (status = 'in_review');
create policy "admins update events" on events for update using (is_admin());
create policy "admins delete events" on events for delete using (is_admin());

-- clicks: anyone writes one row, only admins read
create policy "clicks insert" on link_clicks for insert with check (true);
create policy "clicks admin read" on link_clicks for select using (is_admin());

-- email capture: insert-only from the public, admin read
create policy "subscribe" on subscribers for insert with check (true);
create policy "subscribers admin read" on subscribers for select using (is_admin());
create policy "save events" on saved_events for insert with check (true);
create policy "saved admin read" on saved_events for select using (is_admin());

create policy "admins read admins" on admins for select using (is_admin());

-- ── seed: taxonomy ──
insert into categories (key,name,color,sort) values
  ('talk','The Conversation','#7DD3FC',1),
  ('learn','Learn','#C7A8FF',2),
  ('build','Build','#5EEAD4',3),
  ('fun','Fun','#F472B6',4),
  ('show','Showcase','#FBBF24',5);

insert into app_settings (key,value) values
  ('flags', '{"free":"Free","paid":"Ticketed","newcomer":"New to tech","newcomer_on":true}'),
  ('copy',  '{"start_intro":"You don''t need a job in tech to be here. These picks assume nothing.","save_title":"Save this week","save_body":"Drop your email and we''ll send your list, plus a link that survives a cleared browser."}');

insert into glossary (term,definition,sort) values
  ('demo day','An event where startups show what they built, usually five minutes each. Nobody expects you to invest.',1),
  ('seed round','The first real money a startup raises. After friends-and-family, before Series A.',2),
  ('shipping','Releasing something to real users. "We shipped it" means it''s live.',3),
  ('pitch','A short, practiced explanation of a company. You are allowed to just listen.',4);

-- ── seed: the 23 real events (times/venues provisional, per the mock) ──
insert into events (slug,status,title,description,category,day,start_time,slot,venue_name,luma_url,is_free,newcomer,host_org) values
  ('kickoff-breakfast','published','State of Innovation Kickoff Breakfast','The official opening of Sac Tech Week at Golden 1 Center.','talk','2026-10-19','8:00 AM','Morning','Golden 1 Center','https://lu.ma/stw-kickoff',false,true,'Sac Tech Week'),
  ('suno-101','published','Suno 101: AI Music Production','A hands-on introduction to AI-assisted music production with Suno.','build','2026-10-19','4:00 PM','Afternoon',null,'https://lu.ma/suno-101',true,true,'Dpt of Sound'),
  ('women-in-tech','published','Women in Tech: An Evening Discussion','An evening conversation with women leaders shaping Sacramento tech.','talk','2026-10-19','6:00 PM','Evening',null,'https://lu.ma/wit-evening',true,true,'Tiffani M. & Sophia K.'),
  ('ecosystem-dinner','published','Ecosystem Dinner','A welcoming dinner for the people building Sacramento''s ecosystem.','fun','2026-10-19','7:00 PM','Evening','Location on RSVP','https://lu.ma/eco-dinner',false,false,'Sac Tech Consortium'),
  ('ai-career-pathways','published','AI Career Pathways + Workshop','Emerging AI career pathways, then practical skills in a guided workshop.','learn','2026-10-20','10:00 AM','Morning',null,'https://lu.ma/ai-pathways',true,true,'PWRD by Verizon'),
  ('n8n-at-noon','published','N8N at Noon','A lunchtime session on useful workflows and automations with n8n.','learn','2026-10-20','12:00 PM','Afternoon',null,'https://lu.ma/n8n-noon',true,false,'Simple 10'),
  ('sac-tech-connect','published','Sac Tech Connect','Meet founders, builders, and community members across Sacramento tech.','fun','2026-10-20','5:30 PM','Evening',null,'https://lu.ma/sac-connect',true,true,'StartupSac'),
  ('govt-ai','published','Govt & AI','How government and AI can support better public-sector services.','talk','2026-10-20','6:00 PM','Evening','Folsom','https://lu.ma/govt-ai',true,false,'Startup Folsom'),
  ('common-knowledge','published','Common Knowledge @ UH','Curious people, ideas, conversation, and connection at Urban Hive.','talk','2026-10-21','9:00 AM','Morning','Urban Hive','https://lu.ma/ck-uh',true,true,'Urban Hive'),
  ('ai-small-business','published','AI for Small Business','Practical tools to help small-business owners use AI in everyday work.','learn','2026-10-21','12:00 PM','Afternoon',null,'https://lu.ma/ai-smb',true,true,'Sac Tech Week'),
  ('certified-aws','draft','Certified with AWS','AWS learning and certification pathways for cloud skills.','learn','2026-10-21','3:00 PM','Afternoon',null,null,true,false,'AWS'),
  ('byob-wed','published','Bring Your Own Beamer','A projection-art showcase turning shared space into a canvas of light.','fun','2026-10-21','7:00 PM','Evening','The Warehouse','https://lu.ma/byob-wed',true,true,'BYOB'),
  ('simply-lovable','published','Simply Lovable','Making AI products people genuinely want to use.','learn','2026-10-22','12:00 PM','Afternoon',null,'https://lu.ma/simply-lovable',true,false,'Craftsman AI'),
  ('granite-city','published','Granite City Coworking','The next chapter of health, science, and startup work in the region.','fun','2026-10-22','5:00 PM','Evening','Granite City, Folsom','https://lu.ma/granite-city',true,false,'MedStart'),
  ('curiosity-nights','published','Curiosity Nights @ MOSAC','An after-hours night of science, technology, and hands-on curiosity.','fun','2026-10-22','6:00 PM','Evening','MOSAC','https://lu.ma/curiosity-mosac',false,true,'MOSAC'),
  ('byob-sofar','published','BYOB + SoFar','Projection art meets an intimate live-music experience.','fun','2026-10-22','8:00 PM','Evening','The Warehouse','https://lu.ma/byob-sofar',false,true,'BYOB · SoFar Sounds'),
  ('coffee-claude','published','Coffee & Claude','A casual coffee conversation about working with Claude.','talk','2026-10-23','9:00 AM','Morning',null,'https://lu.ma/coffee-claude',true,true,'Sac Tech Week'),
  ('amazon-pitch','published','Amazon Pitch Competition','Founders present their ideas and compete to move forward.','show','2026-10-23','2:00 PM','Afternoon',null,'https://lu.ma/amzn-pitch',true,true,'Amazon + SF'),
  ('make-made','draft','Make & Made','A celebration of making, design, and tangible creative work.','show','2026-10-23','5:00 PM','Evening',null,null,true,true,'Made Studios'),
  ('byob-fri','published','BYOB','A Friday edition of the projection-art showcase.','fun','2026-10-23','7:00 PM','Evening','The Warehouse','https://lu.ma/byob-fri',true,true,'Bring Your Own Beamer'),
  ('tandem-summit','published','STW Tandem Summit','A full-day gathering of workshops, conversations, and demonstrations.','show','2026-10-24','9:00 AM','Morning',null,'https://lu.ma/tandem-summit',false,true,'Sac Tech Consortium'),
  ('sustainability','published','Sustainability Event','Sustainable ideas, technologies, and actions for the region.','learn','2026-10-24','11:00 AM','Morning',null,'https://lu.ma/stw-sustain',true,true,'Sac Tech Week'),
  ('byob-close','published','BYOB: Closing Night','The final night of projection art.','fun','2026-10-24','7:00 PM','Evening','The Warehouse','https://lu.ma/byob-close',true,true,'Bring Your Own Beamer');

update events set published_at = now() where status = 'published';

-- ── seed: admins. ADD YOUR TEAM'S EMAILS HERE. ──
insert into admins (email) values
  ('joshymargraham@gmail.com');
