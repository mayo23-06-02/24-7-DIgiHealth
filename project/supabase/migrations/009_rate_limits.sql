-- Shared rate-limit counters.
--
-- The limiter previously lived in an in-process Map inside proxy.ts. On Vercel
-- every serverless/edge instance keeps its own copy, so attempts spread across
-- warm instances never shared a budget: a paced run of 12 failed logins drew no
-- 429 at all, while a tight burst tripped after 5. The control was real but
-- leaky, which is materially different from the documented "5 per 15 minutes".
--
-- This moves the counter into Postgres so the budget is global. The increment
-- and the window roll happen inside a single statement, so concurrent requests
-- from different instances cannot both read a stale count.

create table if not exists rate_limits (
  key      text primary key,
  count    integer     not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_at_idx on rate_limits (reset_at);

-- Counters are written only by the service role from middleware; no client
-- ever reads this table directly.
alter table rate_limits enable row level security;

create or replace function check_rate_limit(
  p_key       text,
  p_window_ms bigint,
  p_max       integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := now();
  v_count integer;
begin
  insert into rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case
                  when rate_limits.reset_at <= v_now then 1
                  else rate_limits.count + 1
                end,
        reset_at = case
                     when rate_limits.reset_at <= v_now
                       then v_now + make_interval(secs => p_window_ms / 1000.0)
                     else rate_limits.reset_at
                   end
  returning count into v_count;

  -- Opportunistic cleanup: ~1 call in 100 clears long-expired rows, which
  -- keeps the table bounded without needing a scheduled job.
  if random() < 0.01 then
    delete from rate_limits where reset_at < v_now - interval '1 hour';
  end if;

  -- Allowed while at or under the cap; the request that takes the count past
  -- the cap is the first one refused.
  return v_count <= p_max;
end;
$$;
