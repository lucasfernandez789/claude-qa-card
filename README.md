# claude-qa-card

Plugin de [Claude Code](https://claude.com/claude-code) para hacer QA de cards de GitHub de punta a punta:

1. Lee la card y la mueve en GitHub Projects (**Ready to test → In Testing**).
2. Prueba la funcionalidad en el entorno de testing con **Cypress**, dentro del repo de automatizaciones de tu organización, consultándote en los momentos clave.
3. Genera la hoja estándar de **Casos de Prueba** (`.xlsx`) para copiar en el libro del sistema.
4. Con tu OK, deja el comentario de cierre y mueve la card a **Done** o **In Review** (con el reporte del bug).

## Requisitos

- [Claude Code](https://claude.com/claude-code)
- [Node.js](https://nodejs.org) 18+
- [GitHub CLI](https://cli.github.com) logueado con el scope `project`:
  ```
  gh auth login
  gh auth refresh -h github.com -s project
  ```
- Opcional: [Engram](https://github.com/Gentleman-Programming/engram) para memoria persistente entre sesiones.

## Instalación

Dentro de Claude Code:

```
/plugin marketplace add lucasfernandez789/claude-qa-card
/plugin install qa-card@claude-qa-card
```

La primera vez que lo uses te va a preguntar tu organización de GitHub, tu usuario, tu nombre para
la hoja y (opcional) el logo. Lo guarda en `~/.qa-card/config.json`.

## Uso

```
testea esta card https://github.com/<org>/<repo>/issues/123
```

Para cada card te pide: el link de la issue, las credenciales del entorno de testing (no se guardan)
y el link al libro de Casos de prueba del sistema. Si el sistema es nuevo, también la URL de testing
y el prefijo de la hoja.

## Actualizar

```
/plugin marketplace update claude-qa-card
```

## Licencia

MIT
