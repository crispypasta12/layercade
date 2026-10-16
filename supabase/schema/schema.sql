-- Layercade database schema snapshot, generated 2026-10-16 09:16 UTC.
-- Regenerate with supabase/schema/snapshot_query.sql. Reference only: not a
-- migration, and running it against a live database will fail on existing
-- objects. Changes still go through supabase/migrations/.


-- ─── Extensions ───────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema public;
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists "uuid-ossp" with schema extensions;

-- ─── Sequences ────────────────────────────────────────────────────────────

create sequence if not exists public.products_id_seq;

-- ─── categories ─

create table public.categories (
  id bigint generated always as identity not null,
  name text not null,
  slug text not null,
  sort_order integer default 999 not null,
  created_at timestamp with time zone default now() not null,
  image_url text,
  parent_id bigint,
  constraint categories_name_key UNIQUE (name),
  constraint categories_slug_key UNIQUE (slug),
  constraint categories_pkey PRIMARY KEY (id),
  constraint categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
alter table public.categories enable row level security;


-- ─── colors ─

create table public.colors (
  id uuid default gen_random_uuid() not null,
  name text not null,
  hex text not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint colors_name_unique UNIQUE (name),
  constraint colors_pkey PRIMARY KEY (id)
);
alter table public.colors enable row level security;


-- ─── expense_splits ─

create table public.expense_splits (
  id uuid default gen_random_uuid() not null,
  expense_id uuid,
  member_id uuid,
  amount numeric(10,2) not null,
  constraint expense_splits_pkey PRIMARY KEY (id),
  constraint expense_splits_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  constraint expense_splits_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
alter table public.expense_splits enable row level security;


-- ─── expenses ─

create table public.expenses (
  id uuid default gen_random_uuid() not null,
  title text not null,
  amount numeric(10,2) not null,
  paid_by uuid,
  split_type text default 'equal'::text not null,
  category text default 'other'::text not null,
  date date not null,
  notes text,
  created_at timestamp with time zone default now(),
  constraint expenses_pkey PRIMARY KEY (id),
  constraint expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES members(id) ON DELETE SET NULL
);
alter table public.expenses enable row level security;


-- ─── filament_spools ─

create table public.filament_spools (
  id uuid default gen_random_uuid() not null,
  code text not null,
  status text default 'sealed'::text not null,
  location text,
  brand text,
  material text,
  finish text,
  color_name text not null,
  hex text not null,
  hex_is_estimate boolean default false not null,
  filament_code text,
  spool_type text,
  net_weight_g integer default 1000 not null,
  scale_reading_g numeric,
  needs_check boolean default false not null,
  notes text,
  date_added date default CURRENT_DATE,
  last_dried date,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint filament_spools_code_key UNIQUE (code),
  constraint filament_spools_pkey PRIMARY KEY (id),
  constraint filament_spools_hex_check CHECK ((hex ~ '^#[0-9a-fA-F]{6}$'::text)),
  constraint filament_spools_net_weight_g_check CHECK ((net_weight_g > 0)),
  constraint filament_spools_scale_reading_g_check CHECK ((scale_reading_g >= (0)::numeric)),
  constraint filament_spools_status_check CHECK ((status = ANY (ARRAY['in_ams'::text, 'open'::text, 'sealed'::text, 'low'::text, 'empty'::text])))
);
alter table public.filament_spools enable row level security;


-- ─── idea_votes ─

create table public.idea_votes (
  idea_id uuid not null,
  member_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint idea_votes_pkey PRIMARY KEY (idea_id, member_id),
  constraint idea_votes_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
  constraint idea_votes_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
alter table public.idea_votes enable row level security;


-- ─── ideas ─

create table public.ideas (
  id uuid default gen_random_uuid() not null,
  url text,
  url_key text,
  source text default 'other'::text not null,
  title text not null,
  image_url text,
  author text,
  notes text,
  status text default 'inbox'::text not null,
  "position" integer default 0 not null,
  added_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  tags text[] default '{}'::text[] not null,
  product_id bigint,
  est_print_hours numeric,
  est_filament_g integer,
  est_cost numeric,
  est_price numeric,
  costed_at timestamp with time zone,
  needed_by date,
  occasion text,
  constraint ideas_url_key_key UNIQUE (url_key),
  constraint ideas_pkey PRIMARY KEY (id),
  constraint ideas_added_by_fkey FOREIGN KEY (added_by) REFERENCES members(id) ON DELETE SET NULL,
  constraint ideas_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  constraint ideas_est_cost_check CHECK ((est_cost >= (0)::numeric)),
  constraint ideas_est_filament_g_check CHECK ((est_filament_g > 0)),
  constraint ideas_est_price_check CHECK ((est_price >= (0)::numeric)),
  constraint ideas_est_print_hours_check CHECK ((est_print_hours > (0)::numeric)),
  constraint ideas_occasion_check CHECK ((char_length(occasion) <= 60)),
  constraint ideas_source_check CHECK ((source = ANY (ARRAY['makerworld'::text, 'instagram'::text, 'pinterest'::text, 'other'::text]))),
  constraint ideas_status_check CHECK ((status = ANY (ARRAY['inbox'::text, 'shortlisted'::text, 'test_print'::text, 'listed'::text, 'archived'::text])))
);
alter table public.ideas enable row level security;


-- ─── member_roles ─

create table public.member_roles (
  id uuid default gen_random_uuid() not null,
  member_id uuid,
  role_id uuid,
  constraint member_roles_member_id_role_id_key UNIQUE (member_id, role_id),
  constraint member_roles_pkey PRIMARY KEY (id),
  constraint member_roles_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  constraint member_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES task_roles(id) ON DELETE CASCADE
);
alter table public.member_roles enable row level security;


-- ─── members ─

create table public.members (
  id uuid default gen_random_uuid() not null,
  name text not null,
  color text default '#666666'::text not null,
  created_at timestamp with time zone default now(),
  email text,
  auth_user_id uuid,
  avatar text,
  constraint members_auth_user_id_key UNIQUE (auth_user_id),
  constraint members_email_key UNIQUE (email),
  constraint members_pkey PRIMARY KEY (id),
  constraint members_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint members_avatar_check CHECK (((avatar IS NULL) OR (avatar ~ '^[A-Za-z]+:[A-Za-z0-9_-]{1,40}$'::text)))
);
alter table public.members enable row level security;


-- ─── orders ─

create table public.orders (
  id bigint generated always as identity not null,
  created_at timestamp with time zone default now(),
  customer_name text not null,
  phone text not null,
  address text,
  area text,
  district text,
  items jsonb not null,
  total_amount numeric not null,
  delivery_fee numeric default 60 not null,
  status text default 'pending'::text not null,
  payment_method text default 'cod'::text not null,
  notes text,
  admin_notes text,
  email text,
  fulfillment_type text default 'delivery'::text not null,
  constraint orders_pkey PRIMARY KEY (id)
);
alter table public.orders enable row level security;


-- ─── product_colors ─

create table public.product_colors (
  id uuid default gen_random_uuid() not null,
  product_id bigint not null,
  color_id uuid,
  name text not null,
  hex text not null,
  image text default ''::text not null,
  images jsonb default '[]'::jsonb not null,
  price numeric,
  stock_status text default 'in_stock'::text not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint product_colors_pkey PRIMARY KEY (id),
  constraint product_colors_color_id_fkey FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL,
  constraint product_colors_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
alter table public.product_colors enable row level security;


-- ─── products ─

create table public.products (
  id bigint default nextval('products_id_seq'::regclass) not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  name text not null,
  slug text not null,
  description text,
  price numeric(10,2) not null,
  category text not null,
  image text not null,
  featured boolean default false not null,
  new_arrival boolean default false not null,
  stock_status text default 'in_stock'::text not null,
  sort_order integer default 0 not null,
  images text[] default '{}'::text[] not null,
  cost_price numeric,
  has_color_variants boolean default false not null,
  material text,
  deal_price numeric,
  deal_ends_at timestamp with time zone,
  constraint products_slug_key UNIQUE (slug),
  constraint products_pkey PRIMARY KEY (id),
  constraint products_deal_price_nonnegative CHECK (((deal_price IS NULL) OR (deal_price >= (0)::numeric)))
);
alter table public.products enable row level security;


-- ─── quote_requests ─

create table public.quote_requests (
  id bigint generated by default as identity not null,
  created_at timestamp with time zone default now() not null,
  name text not null,
  email text not null,
  phone text,
  interest text not null,
  message text not null,
  attachments jsonb default '[]'::jsonb not null,
  status text default 'new'::text not null,
  internal_notes text,
  constraint quote_requests_pkey PRIMARY KEY (id)
);
alter table public.quote_requests enable row level security;


-- ─── reviews ─

create table public.reviews (
  id bigint generated always as identity not null,
  product_id bigint not null,
  reviewer_name text not null,
  rating smallint not null,
  body text,
  image_urls text[] default '{}'::text[] not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint reviews_pkey PRIMARY KEY (id),
  constraint reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  constraint reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  constraint reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);
alter table public.reviews enable row level security;


-- ─── settlements ─

create table public.settlements (
  id uuid default gen_random_uuid() not null,
  from_member uuid,
  to_member uuid,
  amount numeric(10,2) not null,
  date date not null,
  notes text,
  created_at timestamp with time zone default now(),
  constraint settlements_pkey PRIMARY KEY (id),
  constraint settlements_from_member_fkey FOREIGN KEY (from_member) REFERENCES members(id) ON DELETE SET NULL,
  constraint settlements_to_member_fkey FOREIGN KEY (to_member) REFERENCES members(id) ON DELETE SET NULL
);
alter table public.settlements enable row level security;


-- ─── task_roles ─

create table public.task_roles (
  id uuid default gen_random_uuid() not null,
  label text not null,
  created_at timestamp with time zone default now(),
  constraint task_roles_label_key UNIQUE (label),
  constraint task_roles_pkey PRIMARY KEY (id)
);
alter table public.task_roles enable row level security;


-- ─── tasks ─

create table public.tasks (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text default ''::text,
  status text default 'todo'::text not null,
  priority text default 'medium'::text not null,
  assignee_ids jsonb default '[]'::jsonb,
  labels jsonb default '[]'::jsonb,
  due_date date,
  "position" integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  reminder_sent_at timestamp with time zone,
  constraint tasks_pkey PRIMARY KEY (id),
  constraint tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
  constraint tasks_status_check CHECK ((status = ANY (ARRAY['backlog'::text, 'todo'::text, 'in_progress'::text, 'review'::text, 'done'::text])))
);
alter table public.tasks enable row level security;


-- ─── Indexes (beyond primary keys and unique constraints) ──────────────────

CREATE INDEX ideas_needed_by_idx ON public.ideas USING btree (needed_by) WHERE (needed_by IS NOT NULL);
CREATE INDEX ideas_product_id_idx ON public.ideas USING btree (product_id);
CREATE INDEX ideas_status_position_idx ON public.ideas USING btree (status, "position");
CREATE INDEX ideas_tags_idx ON public.ideas USING gin (tags);
CREATE INDEX members_auth_user_id_idx ON public.members USING btree (auth_user_id);
CREATE INDEX product_colors_product_sort ON public.product_colors USING btree (product_id, sort_order);
CREATE INDEX reviews_product_id_idx ON public.reviews USING btree (product_id);
CREATE INDEX reviews_status_idx ON public.reviews USING btree (status);

-- ─── Row level security policies ──────────────────────────────────────────

create policy "Public read categories" on public.categories as permissive for select to public
  using (true);

create policy team_members_write_categories on public.categories as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy colors_select_public on public.colors as permissive for select to public
  using (true);

create policy team_members_delete_colors on public.colors as permissive for delete to authenticated
  using (is_team_member());

create policy team_members_insert_colors on public.colors as permissive for insert to authenticated
  with check (is_team_member());

create policy team_members_update_colors on public.colors as permissive for update to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.expense_splits as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.expenses as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.filament_spools as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy own_vote_delete on public.idea_votes as permissive for delete to authenticated
  using ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));

create policy own_vote_insert on public.idea_votes as permissive for insert to authenticated
  with check ((member_id IN ( SELECT members.id
   FROM members
  WHERE (members.auth_user_id = auth.uid()))));

create policy team_members_read on public.idea_votes as permissive for select to authenticated
  using (is_team_member());

create policy team_members_all on public.ideas as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.member_roles as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.members as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_delete_orders on public.orders as permissive for delete to authenticated
  using (is_team_member());

create policy team_members_insert_orders on public.orders as permissive for insert to authenticated
  with check (is_team_member());

create policy team_members_select_orders on public.orders as permissive for select to authenticated
  using (is_team_member());

create policy team_members_update_orders on public.orders as permissive for update to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy product_colors_select_public on public.product_colors as permissive for select to public
  using (true);

create policy team_members_delete_product_colors on public.product_colors as permissive for delete to authenticated
  using (is_team_member());

create policy team_members_insert_product_colors on public.product_colors as permissive for insert to authenticated
  with check (is_team_member());

create policy team_members_update_product_colors on public.product_colors as permissive for update to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy products_select_public on public.products as permissive for select to public
  using (true);

create policy team_members_delete_products on public.products as permissive for delete to authenticated
  using (is_team_member());

create policy team_members_insert_products on public.products as permissive for insert to authenticated
  with check (is_team_member());

create policy team_members_update_products on public.products as permissive for update to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy "Anyone can create quote requests" on public.quote_requests as permissive for insert to anon
  with check (((name <> ''::text) AND (email <> ''::text) AND (message <> ''::text) AND (jsonb_typeof(attachments) = 'array'::text)));

create policy team_members_manage_quote_requests on public.quote_requests as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy anyone_can_submit_review on public.reviews as permissive for insert to public
  with check ((status = 'pending'::text));

create policy approved_reviews_public_read on public.reviews as permissive for select to public
  using ((status = 'approved'::text));

create policy team_members_delete_reviews on public.reviews as permissive for delete to authenticated
  using (is_team_member());

create policy team_members_read_reviews on public.reviews as permissive for select to authenticated
  using (is_team_member());

create policy team_members_update_reviews on public.reviews as permissive for update to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.settlements as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.task_roles as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

create policy team_members_all on public.tasks as permissive for all to authenticated
  using (is_team_member())
  with check (is_team_member());

-- ─── Functions ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_team_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
  );
$function$
;
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  new_assignees jsonb;
  old_assignees jsonb;
  added_assignees jsonb;
  notify_secret text;
BEGIN
  new_assignees := COALESCE(NEW.assignee_ids, '[]'::jsonb);

  IF TG_OP = 'INSERT' THEN
    added_assignees := CASE
      WHEN jsonb_array_length(new_assignees) > 0 THEN new_assignees
      ELSE NULL
    END;
  ELSE
    old_assignees := COALESCE(OLD.assignee_ids, '[]'::jsonb);
    SELECT jsonb_agg(val)
    INTO added_assignees
    FROM jsonb_array_elements(new_assignees) AS val
    WHERE val NOT IN (SELECT jsonb_array_elements(old_assignees));
  END IF;

  IF added_assignees IS NULL OR jsonb_array_length(added_assignees) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO notify_secret
  FROM vault.decrypted_secrets
  WHERE name = 'task_notify_secret'
  LIMIT 1;

  PERFORM net.http_post(
    url := 'https://tktysqcvebtzryuvxkrt.supabase.co/functions/v1/notify-task-assignment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Notify-Secret', notify_secret
    ),
    body := jsonb_build_object(
      'task_id',         NEW.id,
      'task_title',      NEW.title,
      'task_priority',   NEW.priority,
      'task_due_date',   NEW.due_date,
      'added_assignees', added_assignees
    )
  );

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.place_order(p_customer_name text, p_email text, p_phone text, p_fulfillment_type text, p_address text, p_area text, p_district text, p_items jsonb, p_total_amount numeric, p_delivery_fee numeric, p_notes text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id      bigint;
  v_item          jsonb;
  v_quantity      integer;
  v_regular_price numeric;
  v_deal_price    numeric;
  v_deal_ends_at  timestamptz;
  v_unit_price    numeric;
  v_subtotal      numeric := 0;
  v_delivery_fee  numeric;
begin
  if p_fulfillment_type is null or p_fulfillment_type not in ('delivery', 'pickup') then
    raise exception 'Invalid fulfillment type: %', p_fulfillment_type;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many line items';
  end if;

  if p_fulfillment_type = 'delivery'
     and (coalesce(btrim(p_address), '') = '' or coalesce(btrim(p_district), '') = '') then
    raise exception 'Delivery orders require an address and district';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));

    select coalesce(pc.price, p.price), p.deal_price, p.deal_ends_at
      into v_regular_price, v_deal_price, v_deal_ends_at
      from public.products p
      left join public.product_colors pc
             on pc.id::text = nullif(v_item ->> 'colorId', '')
            and pc.product_id::text = p.id::text
            and pc.is_active
     where p.id::text = (v_item ->> 'productId');

    if v_regular_price is null then
      raise exception 'Unknown or unpriced product in order: %', v_item ->> 'productId';
    end if;

    v_unit_price := case
      when v_deal_price is not null
       and v_deal_ends_at > now()
       and v_deal_price < v_regular_price
      then v_deal_price
      else v_regular_price
    end;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_delivery_fee := case
    when p_fulfillment_type = 'pickup' then 0
    when p_district = 'Dhaka'          then 60
    else                                    120
  end;

  insert into public.orders (
    customer_name, email, phone, fulfillment_type,
    address, area, district, items,
    total_amount, delivery_fee, notes, status
  )
  values (
    p_customer_name,
    p_email,
    p_phone,
    p_fulfillment_type,
    case when p_fulfillment_type = 'delivery' then p_address  else null end,
    case when p_fulfillment_type = 'delivery' then p_area     else null end,
    case when p_fulfillment_type = 'delivery' then p_district else null end,
    p_items,
    v_subtotal + v_delivery_fee,
    v_delivery_fee,
    p_notes,
    'pending'
  )
  returning id into v_order_id;

  return v_order_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.send_due_task_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  rec RECORD;
  notify_secret text;
  reminded_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT decrypted_secret INTO notify_secret
  FROM vault.decrypted_secrets
  WHERE name = 'task_reminder_secret'
  LIMIT 1;

  IF notify_secret IS NULL THEN
    RAISE WARNING 'task_reminder_secret missing from Vault, aborting reminder run';
    RETURN;
  END IF;

  FOR rec IN
    SELECT id, title, priority, due_date, assignee_ids
    FROM public.tasks
    WHERE due_date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND status NOT IN ('done', 'review')
      AND reminder_sent_at IS NULL
      AND assignee_ids IS NOT NULL
      AND jsonb_array_length(assignee_ids) > 0
  LOOP
    PERFORM net.http_post(
      url := 'https://tktysqcvebtzryuvxkrt.supabase.co/functions/v1/send-task-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Reminder-Secret', notify_secret
      ),
      body := jsonb_build_object(
        'task_id',       rec.id,
        'task_title',    rec.title,
        'task_priority', rec.priority,
        'task_due_date', rec.due_date,
        'assignees',     rec.assignee_ids
      )
    );
    reminded_ids := array_append(reminded_ids, rec.id);
  END LOOP;

  IF array_length(reminded_ids, 1) > 0 THEN
    UPDATE public.tasks
    SET reminder_sent_at = now()
    WHERE id = ANY(reminded_ids);
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

-- ─── Triggers ─────────────────────────────────────────────────────────────

CREATE TRIGGER filament_spools_updated_at BEFORE UPDATE ON public.filament_spools FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER task_assignment_trigger AFTER INSERT OR UPDATE OF assignee_ids ON public.tasks FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();

-- ─── pg_cron jobs ─────────────────────────────────────────────────────────

select cron.schedule('daily-task-reminders', '0 3 * * *', 'SELECT public.send_due_task_reminders();');

-- ─── Storage buckets ──────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('idea-images', 'idea-images', true);

-- ─── Vault secrets (names only; set values in the dashboard) ──────────────

-- task_notify_secret
-- task_reminder_secret
