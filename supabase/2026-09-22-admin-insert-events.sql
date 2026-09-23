-- Admins add events directly from the console (any status), not just
-- through the public in_review submission path.
create policy "admins insert events" on events for insert with check (is_admin());
