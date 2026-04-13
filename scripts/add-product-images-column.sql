alter table public.products
add column if not exists images text[] not null default '{}'::text[];

update public.products
set images = case
  when images is not null and cardinality(images) > 0 then images
  when image is null or btrim(image) = '' then '{}'::text[]
  when left(btrim(image), 1) = '[' then (
    select coalesce(array_agg(value), '{}'::text[])
    from jsonb_array_elements_text(image::jsonb) as value
  )
  else array[image]
end
where images is null
   or cardinality(images) = 0;

update public.products
set image = images[1]
where (image is null or btrim(image) = '')
  and cardinality(images) > 0;
