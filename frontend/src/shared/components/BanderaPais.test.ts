import { describe, it, expect } from 'vitest'
import { toCode } from './BanderaPais'

// Bug real que ocurrió en el proyecto: la vista pública pasa NOMBRES de país
// ("Francia") mientras las vistas con login pasan códigos ISO ("FR").
// Sin este mapeo, las banderas de la vista pública salían rotas.
describe('toCode (BanderaPais)', () => {
  it('acepta códigos ISO-2 en cualquier capitalización', () => {
    expect(toCode('BR')).toBe('br')
    expect(toCode('pe')).toBe('pe')
  })

  it('convierte nombres de país en español a su código ISO', () => {
    expect(toCode('Francia')).toBe('fr')
    expect(toCode('Uruguay')).toBe('uy')
    expect(toCode('Brasil')).toBe('br')
  })

  it('tolera tildes y mayúsculas en los nombres', () => {
    expect(toCode('Perú')).toBe('pe')
    expect(toCode('ESPAÑA')).toBe('es')
  })

  it('devuelve null para países no registrados (la UI muestra bandera neutra)', () => {
    expect(toCode('Atlántida')).toBeNull()
    expect(toCode('Japón')).toBeNull()
  })
})
