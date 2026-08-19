---
name: descripcion-cargo
description: "Genera documentos Word (.docx) de 'Descripción de Cargo' / 'Perfil de Puesto' de la empresa del usuario, usando siempre la plantilla y estructura corporativa (12 secciones: identificación, dimensiones, finalidad, responsabilidades, perfil, relaciones internas/externas, naturaleza de la responsabilidad, indicadores, competencias, condiciones de trabajo, medidas de seguridad, otros roles). Úsala SIEMPRE que el usuario pida crear, generar, redactar o actualizar la descripción de cargo, perfil de puesto, ficha de cargo o job description de un rol específico (p. ej. 'crea la descripción de cargo de Analista de Compras', 'necesito el perfil de puesto de Gerente de Ventas', 'redáctame la ficha del cargo Supervisor de Planta'), incluso si el usuario no menciona la palabra 'plantilla' o 'formato' explícitamente — el formato corporativo siempre aplica por defecto. También úsala si el usuario pide ajustar o completar una descripción de cargo ya generada con esta skill."
---
 
# Descripción de Cargo
 
Genera documentos Word con la descripción de un cargo/puesto de trabajo,
siguiendo siempre el formato corporativo del usuario (`assets/plantilla_descripcion_cargo.docx`):
mismo logo, mismo encabezado, mismas 12 secciones y mismas tablas. El
documento se arma con un script que rellena la plantilla real, así que el
resultado conserva el estilo exacto (bordes, colores, tipografía) sin que
Claude tenga que reconstruirlo desde cero.
 
## Cómo trabaja el usuario contigo
 
El usuario normalmente solo te va a decir algo como "crea la descripción de
cargo de [nombre del cargo]" y espera que **tú generes el contenido de cada
sección con tu propio conocimiento** del rol (funciones típicas, perfil,
competencias, etc.), en español, con tono profesional de RRHH. A veces el
usuario te va a dar información puntual que quiere que sí o sí esté incluida
(por ejemplo, a quién reporta el cargo, el departamento, alguna función
específica) — en ese caso, prioriza siempre lo que el usuario indique
explícitamente sobre lo que tú infieras.
 
No hace falta interrogar al usuario campo por campo antes de generar el
documento: redacta un borrador completo y razonable con lo que sabes del
cargo, y si falta algo verdaderamente crítico para poder redactar (por
ejemplo, no tienes ni idea de qué tipo de cargo es), pregunta solo eso.
 
## Flujo de trabajo
 
1. **Identifica el cargo** y reúne cualquier dato que el usuario haya dado
   explícitamente (departamento, jefe directo, funciones concretas, nivel
   jerárquico, etc.).
2. **Redacta el contenido de las 12 secciones** en un objeto de datos (ver
   `references/schema_datos.md` para los campos exactos). Escribe en español
   neutro, tono profesional, en tercera persona ("Es responsable de...",
   "Elabora...", "Coordina..."). Sé específico y realista para el cargo, no
   genérico — usa tu conocimiento del rol, la industria si se menciona, y
   sentido común de estructura organizacional.
3. **Elige las competencias (sección 9)** según el título del cargo: lee
   `references/competencias.md`. La regla es por el nombre del cargo, no por
   una inferencia general del "nivel":
   - Si el título del cargo es o incluye **Jefe/Jefatura** o **Gerente/
     Gerencia** (p. ej. "Jefe de Compras", "Gerente de Ventas", "Gerente
     General") → usa las competencias **gerenciales**.
   - Cualquier otro título (analista, coordinador, supervisor, ejecutivo,
     asistente, comercial, operativo, técnico, etc.) → usa las competencias
     **comerciales**.
   - Los cargos de **Dirección** (Director/Directora) también usan
     gerenciales, por quedar por encima de Gerencia — pero la señal
     principal para decidir es "¿el título dice Jefe o Gerente?".
   Selecciona entre 4 y 6 competencias pertinentes al cargo concreto, no
   todas las de la lista.
4. **Guarda los datos como JSON** en un archivo temporal y ejecuta el script
   de relleno:
   ```bash
   python3 scripts/fill_template.py /tmp/datos_cargo.json /mnt/user-data/outputs/Descripcion_de_Cargo_<Nombre_del_Cargo>.docx
   ```
   El script toma automáticamente la plantilla de `assets/plantilla_descripcion_cargo.docx`
   (no hace falta indicarla) y preserva el formato original clonando filas de
   tabla cuando hacen falta más de las que trae la plantilla en blanco.
5. **Verifica visualmente el resultado** antes de entregarlo (esto es
   importante: el script puede fallar silenciosamente en encontrar un
   encabezado si el usuario editó la plantilla, o dejar una tabla con filas
   de más/menos):
   ```bash
   python /mnt/skills/public/docx/scripts/office/soffice.py --headless --convert-to pdf /mnt/user-data/outputs/Descripcion_de_Cargo_<Nombre>.docx --outdir /tmp
   pdftoppm -jpeg -r 100 /tmp/Descripcion_de_Cargo_<Nombre>.pdf /tmp/page
   ```
   Revisa las imágenes generadas (`/tmp/page-*.jpg`) con la herramienta de
   ver archivos. Si algo quedó mal ubicado o una tabla quedó con filas vacías
   de sobra, corrige el JSON y vuelve a correr el script — no edites el
   .docx de salida a mano.
6. **Entrega el archivo** con la herramienta de presentar archivos. No hace
   falta explicar el proceso técnico al usuario, solo comentar brevemente
   qué generaste y ofrecer ajustar cualquier sección si lo pide.
## Notas importantes
 
- **Nunca cambies la estructura, el orden de las secciones, ni el diseño de
  las tablas.** El formato es fijo — lo único que cambia entre cargos es el
  contenido.
- La tabla de "Documentos de Referencia" al final de la plantilla es
  información fija de la empresa (glosario, etc.) — el script no la toca,
  no hace falta generarle contenido.
- Si el usuario pide ajustes puntuales sobre un documento ya generado (p. ej.
  "cámbiame la sección de responsabilidades"), no regeneres todo desde cero:
  actualiza solo esa parte del JSON de datos y vuelve a correr el script.
- Si el usuario comparte su propio catálogo de competencias de la empresa en
  algún momento de la conversación, úsalo en vez del de
  `references/competencias.md` para esa y las siguientes descripciones de
  cargo de la conversación.
- El código de documento (Código, Revisión en el encabezado) normalmente no
  lo sabe el usuario de antemano — déjalo en blanco salvo que el usuario lo
  indique; la fecha del encabezado se deja tal como viene en la plantilla.
## Referencias
 
- `references/schema_datos.md` — estructura exacta del JSON que espera
  `scripts/fill_template.py`, sección por sección.
- `references/competencias.md` — catálogo de competencias gerenciales y
  comerciales/operativas para la sección 9.