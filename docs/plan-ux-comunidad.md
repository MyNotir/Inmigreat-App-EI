# Plan UX Comunidad

Documento de referencia para retomar mas adelante la reorganizacion visual de la vista Comunidad en la app.

Fecha de decision: 2026-04-08.

## Objetivo

Evitar que la pantalla de Comunidad funcione como una lista plana de grupos uno debajo del otro y moverla hacia una experiencia mas orientada al seguimiento del usuario.

## Restriccion actual

La propuesta se limita a los datos que hoy expone el backend y ya consume la app:

- `isMember`
- `type`
- `memberCount`
- `activeCount`
- `trending`
- `growth`
- `tags`
- `pinnedPost`

No depende todavia de nuevos campos como relacion con profesional, prioridad personalizada, ultima actividad calculada por backend o clasificacion explicita de grupos guiados.

## Direccion elegida por ahora

Se prioriza la opcion `Mi seguimiento primero`.

La pantalla debe responder primero a la pregunta `donde continuo` y despues a la pregunta `que grupos existen`.

## Estructura propuesta

### 1. Tu seguimiento

Primera seccion visible de la pantalla.

Debe mostrar solo grupos a los que el usuario ya pertenece (`isMember = true`).

Intencion UX:

- Continuar rapidamente donde ya participa.
- Priorizar actividad reciente sobre descubrimiento.
- Reducir la sensacion de catalogo.

Contenido recomendado por card:

- Nombre del grupo.
- Indicador visual de estado o relevancia cuando aplique.
- Resumen corto de actividad reciente usando `pinnedPost` como proxy inicial.
- CTA principal `Continuar` o `Abrir grupo`.

Orden sugerido inicial:

1. Grupos con `pinnedPost`.
2. Dentro de ellos, grupos con mayor `activeCount`.
3. Luego el resto de grupos unidos.

### 2. Descubrir grupos

Segunda seccion visible.

Debe mostrar grupos no unidos por el usuario (`isMember = false`) y priorizar descubrimiento simple.

Orden sugerido inicial:

1. Grupos gratis.
2. Grupos `trending`.
3. Grupos con mayor `activeCount`.

Objetivo:

- Mantener exploracion sin competir con el seguimiento principal.
- Hacer que la lista general se sienta secundaria frente a `Tu seguimiento`.

### 3. Espacios Pro

Tercera seccion, separada visualmente del resto.

Debe agrupar grupos de tipo `paid` que el usuario todavia no ha unido o que requieren acceso adicional.

Objetivo:

- No mezclar acceso restringido con continuidad del usuario.
- Mantener un lenguaje mas editorial y menos operativo.

## Reglas visuales propuestas

- `Tu seguimiento` debe sentirse mas compacto y utilitario.
- `Descubrir grupos` puede conservar cards mas descriptivas.
- `Espacios Pro` debe tener una identidad visual separada, pero sin convertirse en el bloque dominante.
- El CTA de grupos unidos debe ser distinto del CTA de grupos nuevos.

## Lo que no se implementa todavia

- Segmentacion por grupos del cliente o guiados por profesional.
- Priorizacion personalizada por etapa migratoria.
- Bandeja de actividad en tiempo real.
- Badges basados en nuevas capacidades de backend que aun no existen.

## Dependencias futuras deseables

Para una segunda iteracion, convendria que backend exponga algunas señales adicionales:

- ultima actividad relevante por grupo
- relacion del grupo con profesional, programa o cliente
- prioridad o recomendacion personalizada
- contadores de novedades no vistas

## Criterio para retomarlo

Cuando se vuelva a trabajar la pantalla Comunidad, esta propuesta debe tomarse como direccion base antes de abrir nuevas exploraciones visuales.

Si no hay nuevos datos de backend disponibles, la implementacion debe seguir limitada a la segmentacion por `isMember`, `type`, `trending`, `activeCount` y `pinnedPost`.