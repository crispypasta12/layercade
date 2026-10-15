-- Ideas board: target dates for seasonal ideas.
--
-- needed_by is the day the product has to be on sale (Eid, Pohela Boishakh,
-- Valentine's…); occasion is the label shown with the countdown. Both are
-- optional. Cards count down to needed_by and the board can sort and filter
-- by it ("Due soon").

begin;

alter table public.ideas
  add column if not exists needed_by date,
  add column if not exists occasion  text check (char_length(occasion) <= 60);

create index if not exists ideas_needed_by_idx on public.ideas (needed_by) where needed_by is not null;

commit;
