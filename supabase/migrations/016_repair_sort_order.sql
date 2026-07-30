-- Repair sort_order so every item has a unique stable position.
-- Preserves current relative order; stops "edit jumps to top" when many rows share 0.

with ranked as (
  select
    id,
    (row_number() over (
      order by sort_order asc, created_at asc, id asc
    ) - 1)::int as new_sort
  from public.portfolio_items
)
update public.portfolio_items p
set sort_order = r.new_sort
from ranked r
where p.id = r.id;
