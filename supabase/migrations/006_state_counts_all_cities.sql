-- Include all states that have active cities in stateCounts (even with 0 tours)

drop function if exists public.get_portfolio_page(int, int, text, text, text, text);

create or replace function public.get_portfolio_page(
  p_page int,
  p_page_size int,
  p_city text default null,
  p_media_type text default null,
  p_category text default null,
  p_state text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_page_size int := least(greatest(coalesce(p_page_size, 48), 1), 100);
  v_offset int;
  v_total int;
  v_items jsonb;
  v_city_counts jsonb;
  v_category_counts jsonb;
  v_state_counts jsonb;
  v_city_states jsonb;
begin
  v_offset := (v_page - 1) * v_page_size;

  select coalesce(
    jsonb_object_agg(c.name, coalesce(cnt.count, 0)),
    '{}'::jsonb
  )
  into v_city_counts
  from public.cities c
  left join lateral (
    select count(*)::int as count
    from public.portfolio_items pi
    where pi.is_published = true
      and pi.city_id = c.id
      and (p_media_type is null or pi.media_type = p_media_type)
      and (p_category is null or pi.category = p_category)
  ) cnt on true
  where c.is_active = true
    and (p_state is null or c.state = p_state);

  select coalesce(
    jsonb_object_agg(st.state, st.count),
    '{}'::jsonb
  )
  into v_state_counts
  from (
    select
      c.state,
      coalesce(sum(cnt.count), 0)::int as count
    from public.cities c
    left join lateral (
      select count(*)::int as count
      from public.portfolio_items pi
      where pi.is_published = true
        and pi.city_id = c.id
        and (p_media_type is null or pi.media_type = p_media_type)
        and (p_category is null or pi.category = p_category)
    ) cnt on true
    where c.is_active = true
      and c.state is not null
      and trim(c.state) <> ''
    group by c.state
    order by c.state
  ) st;

  select coalesce(
    jsonb_object_agg(c.name, c.state),
    '{}'::jsonb
  )
  into v_city_states
  from public.cities c
  where c.is_active = true
    and c.state is not null
    and trim(c.state) <> '';

  select coalesce(
    jsonb_object_agg(cat.category, cat.count),
    '{}'::jsonb
  )
  into v_category_counts
  from (
    select pi.category, count(*)::int as count
    from public.portfolio_items pi
    left join public.cities c on c.id = pi.city_id
    where pi.is_published = true
      and pi.category is not null
      and trim(pi.category) <> ''
      and (p_media_type is null or pi.media_type = p_media_type)
      and (p_city is null or c.name = p_city)
      and (p_state is null or c.state = p_state)
    group by pi.category
    order by pi.category
  ) cat;

  select count(*)::int
  into v_total
  from public.portfolio_items pi
  left join public.cities c on c.id = pi.city_id
  where pi.is_published = true
    and (p_city is null or c.name = p_city)
    and (p_media_type is null or pi.media_type = p_media_type)
    and (p_category is null or pi.category = p_category)
    and (p_state is null or c.state = p_state);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      pi.id,
      pi.name,
      pi.link,
      pi.thumbnail_path as thumbnail,
      c.name as city,
      c.state as state,
      pi.media_type as "mediaType",
      pi.category
    from public.portfolio_items pi
    left join public.cities c on c.id = pi.city_id
    where pi.is_published = true
      and (p_city is null or c.name = p_city)
      and (p_media_type is null or pi.media_type = p_media_type)
      and (p_category is null or pi.category = p_category)
      and (p_state is null or c.state = p_state)
    order by pi.sort_order asc, pi.name asc
    limit v_page_size
    offset v_offset
  ) t;

  return jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'pageSize', v_page_size,
    'hasMore', (v_offset + jsonb_array_length(v_items)) < v_total,
    'cityCounts', v_city_counts,
    'categoryCounts', v_category_counts,
    'stateCounts', v_state_counts,
    'cityStates', v_city_states
  );
end;
$$;

grant execute on function public.get_portfolio_page(int, int, text, text, text, text) to anon, authenticated;
