-- ════════════════════════════════════════════════════════════════════════════
-- 0015: Career CV / Resume uploads (private storage bucket).
--
-- Visitors applying on /careers can upload a PDF/DOC/DOCX resume (max 5 MB)
-- into the `resumes` bucket. Only signed-in admins (public.is_admin()) can
-- read, download, or delete uploaded CVs from /admin/careers.
-- Anonymous visitors can ONLY insert — never list or read other applicants' CVs.
-- Safe to run more than once in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon upload resumes" on storage.objects;
create policy "anon upload resumes" on storage.objects
  for insert to anon
  with check (bucket_id = 'resumes');

drop policy if exists "admin read resumes" on storage.objects;
create policy "admin read resumes" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and public.is_admin());

drop policy if exists "admin delete resumes" on storage.objects;
create policy "admin delete resumes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and public.is_admin());
