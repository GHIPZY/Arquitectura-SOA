import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from './supabase'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email?: string
    rol: 'administrador' | 'coordinador' | 'espectador' | 'arbitro'
  }
  token?: string
}

function decodeJwtPayload(token: string): { sub?: string; exp?: number; email?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload
  } catch {
    return null
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización no provisto o inválido.' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token vacío.' })

  try {
    // Decodificar JWT localmente sin llamada de red
    const payload = decodeJwtPayload(token)

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Token inválido.' })
    }

    // Verificar expiración
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return res.status(401).json({ error: 'Sesión expirada.' })
    }

    // Obtener el rol del usuario desde la base de datos (usa service_role, no hace auth remota)
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', payload.sub)
      .single()

    if (dbError || !dbUser) {
      return res.status(403).json({ error: 'No se pudo verificar el rol del usuario.' })
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      rol: dbUser.rol as 'administrador' | 'coordinador' | 'espectador' | 'arbitro'
    }
    req.token = token

    next()
  } catch (err) {
    return res.status(500).json({ error: 'Error interno en el middleware de autenticación.' })
  }
}
