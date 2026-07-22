begin;

update public.equipment
set status = case lower(trim(replace(replace(coalesce(status, 'available'), '_', ' '), '-', ' ')))
  when 'checked in' then 'available'
  when 'checked out' then 'in use'
  when 'deployed' then 'in use'
  when 'inspection required' then 'under maintenance'
  when 'damaged' then 'under maintenance'
  when 'unusable' then 'under maintenance'
  else lower(trim(replace(replace(coalesce(status, 'available'), '_', ' '), '-', ' ')))
end;

update public.events
set status = lower(trim(replace(replace(coalesce(status, 'planned'), '_', ' '), '-', ' ')));

update public.maintenance_logs
set status = case lower(trim(replace(replace(coalesce(status, 'reported'), '_', ' '), '-', ' ')))
  when 'open' then 'reported'
  when 'pending' then 'reported'
  when 'servicing' then 'in progress'
  when 'under maintenance' then 'in progress'
  when 'complete' then 'resolved'
  when 'completed' then 'resolved'
  else lower(trim(replace(replace(coalesce(status, 'reported'), '_', ' '), '-', ' ')))
end;

update public.rfid_tags
set status = case lower(trim(replace(replace(coalesce(status, 'inactive'), '_', ' '), '-', ' ')))
  when 'pending' then 'unassigned'
  when 'assigned' then 'active'
  else lower(trim(replace(replace(coalesce(status, 'inactive'), '_', ' '), '-', ' ')))
end;

update public.part_timer
set status = case lower(trim(replace(replace(coalesce(status, 'inactive'), '_', ' '), '-', ' ')))
  when 'enabled' then 'active'
  when 'disabled' then 'inactive'
  else lower(trim(replace(replace(coalesce(status, 'inactive'), '_', ' '), '-', ' ')))
end;

alter table public.equipment drop constraint if exists equipment_status_values_check;
alter table public.equipment alter column status set default 'available';
alter table public.equipment add constraint equipment_status_values_check
  check (status in ('available', 'reserved', 'in use', 'under maintenance', 'retired', 'lost'));

alter table public.events drop constraint if exists events_status_values_check;
alter table public.events alter column status set default 'planned';
alter table public.events add constraint events_status_values_check
  check (status in ('planned', 'assigned', 'partially fulfilled', 'fulfilled', 'completed', 'cancelled'));

alter table public.maintenance_logs drop constraint if exists maintenance_logs_status_values_check;
alter table public.maintenance_logs alter column status set default 'reported';
alter table public.maintenance_logs add constraint maintenance_logs_status_values_check
  check (status in ('reported', 'in progress', 'resolved'));

alter table public.rfid_tags drop constraint if exists rfid_tags_status_values_check;
alter table public.rfid_tags alter column status set default 'unassigned';
alter table public.rfid_tags add constraint rfid_tags_status_values_check
  check (status in ('unassigned', 'active', 'inactive', 'lost'));

alter table public.part_timer drop constraint if exists part_timer_status_values_check;
alter table public.part_timer alter column status set default 'active';
alter table public.part_timer add constraint part_timer_status_values_check
  check (status in ('active', 'inactive'));

commit;
