-- Medications: the ongoing prescription list for a care recipient.
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  instructions text,
  prescribing_doctor text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_medications_recipient on public.medications(care_recipient_id, active);

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  taken_by uuid references public.profiles(id) on delete set null,
  taken_at timestamptz not null default now(),
  log_date date not null default current_date,
  notes text
);

create index idx_medication_logs_med_date on public.medication_logs(medication_id, log_date);
create index idx_medication_logs_recipient_date on public.medication_logs(care_recipient_id, log_date);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  title text not null,
  doctor_name text,
  location text,
  appointment_at timestamptz not null,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'canceled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_appointments_recipient_time on public.appointments(care_recipient_id, appointment_at);

alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.appointments enable row level security;

create policy "medications_select" on public.medications
  for select using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medications.household_id and hm.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.care_recipient_caregivers crc
      where crc.care_recipient_id = medications.care_recipient_id
        and crc.profile_id = auth.uid()
        and crc.active = true
    )
  );

create policy "medication_logs_select" on public.medication_logs
  for select using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_logs.household_id and hm.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.care_recipient_caregivers crc
      where crc.care_recipient_id = medication_logs.care_recipient_id
        and crc.profile_id = auth.uid()
        and crc.active = true
    )
  );

create policy "appointments_select" on public.appointments
  for select using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = appointments.household_id and hm.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.care_recipient_caregivers crc
      where crc.care_recipient_id = appointments.care_recipient_id
        and crc.profile_id = auth.uid()
        and crc.active = true
    )
  );
