-- ── Menu attachments ─────────────────────────────────────────────────────────
-- A restaurant can attach its menu as a photo/PDF, or link to one it already
-- has online. Two jobs:
--
--   1. A restaurant is listed the same day it signs up, before anyone has typed
--      forty dishes. Customers see the real menu and can call.
--   2. The uploaded file is what parse-menu reads to fill in menu_items.
--
-- Ordering still comes from menu_items — an image can't be added to a cart.
-- The attachment stays useful afterwards, since a photo always carries more
-- than anyone bothers to type.
--
-- Safe to run more than once.

alter table public.restaurants
  add column if not exists menu_file_url text,   -- uploaded photo or PDF
  add column if not exists menu_url      text;   -- their own online menu

comment on column public.restaurants.menu_file_url is
  'Uploaded menu image or PDF. Shown as "View full menu" and read by parse-menu.';
comment on column public.restaurants.menu_url is
  'Link to a menu the business already hosts elsewhere.';

-- ── Verify ───────────────────────────────────────────────────────────────────
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='restaurants'
--   and column_name in ('menu_file_url','menu_url');
