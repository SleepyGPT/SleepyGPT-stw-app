-- Link-pending events: listed publicly with "Registration opens soon" and no
-- RSVP button, until the host's Luma page exists. `published` still requires
-- a Luma link (published_needs_luma is untouched), so a published event can
-- never show a dead button.

-- 1) Allow the new status. Drops the inline status check by definition, not
--    by guessed name, so it can't silently miss.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%in_review%'
  loop
    execute format('alter table public.events drop constraint %I', c);
  end loop;
end $$;
alter table events add constraint events_status_check
  check (status in ('draft','in_review','link_pending','published','declined'));

-- 2) The public can read link-pending events too.
drop policy if exists "published events are public" on events;
create policy "listed events are public" on events for select
  using (status in ('published','link_pending') or is_admin());

-- 3) Chip label, kept with the other admin-managed labels.
update app_settings set value = value || '{"pending":"RSVP soon"}'::jsonb where key = 'flags';

-- 4) From the Call for Event Partners sheet (2026-09-15). Host contact info
--    lives in stw-luma-drafts/, not here: listed rows are publicly readable.
insert into events (slug,status,title,description,category,day,start_time,slot,venue_name,is_virtual,is_free,newcomer,host_org) values
  ('ai-startup-showcase','link_pending','AI Startup Showcase',
   '25 startups built during HUMANBULB''s 8-week AI-Native Accelerator this summer. Meet the founders as they pitch their companies and demo the AI-powered products they built.',
   'show','2026-10-19','6:00 PM','Evening','Roseville Venture Lab',false,true,true,'HUMANBULB'),
  ('strategy-first-marketing','link_pending','Strategy-First Marketing',
   'Tired of posting content and hoping something sticks? Figure out who you''re actually talking to, what makes you different, and what the data''s telling you before you touch a single ad.',
   'learn','2026-10-21','10:00 AM','Morning',null,false,true,true,'Represent Media Studios'),
  ('zero-to-ai','link_pending','Zero to AI: Foundations for Growth',
   'A practical, beginner-friendly virtual workshop for entrepreneurs and small business owners who want better results from AI. No technical background or paid AI account required.',
   'learn','2026-10-22','5:30 PM','Evening','Zoom',true,true,true,'Alliance for Community Development'),
  ('youth-tech-lab','link_pending','Youth Tech Lab: Build. Create. Compete.',
   'A hands-on night of engineering, making, XR, and robotics for Sacramento youth ages 12 to 24: a zip-line build-off, a clothing upcycling maker lab, an XR rhythm game challenge, and humans vs. robots.',
   'build','2026-10-23','6:00 PM','Evening','HUMANBULB Innovation Center',false,true,true,'HUMANBULB'),
  -- No date yet (form says Oct 15, host says date is open): admin queue only.
  ('creative-direction-ai-era','in_review','Creative Direction in the AI Era',
   'How AI is becoming a creative production layer for brands, filmmakers, designers, and entrepreneurs, while keeping human taste, authorship, and cultural understanding at the center.',
   'learn','2026-10-15','3:00 PM','Afternoon',null,false,true,false,'MACHINE DIGITAL');

select status, count(*) from events group by status order by status;
