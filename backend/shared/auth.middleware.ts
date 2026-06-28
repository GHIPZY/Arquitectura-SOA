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

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización no provisto o inválido.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Validar el token directamente contra Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' })
    }

    // Obtener el rol del usuario desde la tabla de base de datos 'usuarios'
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (dbError || !dbUser) {
      return res.status(403).json({ error: 'No se pudo verificar el rol del usuario.' })
    }

    req.user = {
      id: user.id,
      email: user.email,
      rol: dbUser.rol as 'administrador' | 'coordinador' | 'espectador' | 'arbitro'
    }
    req.token = token

    next()
  } catch (err) {
    return res.status(500).json({ error: 'Error interno en el middleware de autenticación.' })
  }
}
