create table if not exists rate_limits(
  id bigserial primary key,
  ip inet not null,
  route text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limits_window on rate_limits(ip, route, created_at desc);
create or replace function rate_limit_hit(p_ip inet, p_route text, p_now timestamptz, p_from timestamptz)
returns jsonb language plpgsql security definer as $$
declare hits int;
begin
  insert into rate_limits(ip, route, created_at) values (p_ip, p_route, p_now);
  select count(*) into hits from rate_limits where ip = p_ip and route = p_route and created_at >= p_from;
  return jsonb_build_object('count', hits);
end $$;
