-- Tabla de notificaciones por rol/usuario
-- Ejecutar en Supabase: Dashboard → SQL Editor → pegar y Run

create table if not exists notificaciones (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  -- Destinatario: por rol (broadcast) o usuario específico. Al menos uno.
  rol_destino text check (rol_destino in ('administrador', 'coordinador', 'espectador')),
  usuario_destino uuid references usuarios(id) on delete cascade,
  tipo text not null,              -- 'resultado' | 'inscripcion' | 'encuentro'
  titulo text not null,
  mensaje text not null,
  leida boolean not null default false
);

create index if not exists idx_notif_usuario on notificaciones(usuario_destino, created_at desc);
create index if not exists idx_notif_rol on notificaciones(rol_destino, created_at desc);

-- Habilitar Realtime para que el frontend reciba INSERTs por WebSocket
alter publication supabase_realtime add table notificaciones;
