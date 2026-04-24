-- Migration: 20260417160000_populate_normas_personal.sql
-- Description: Deduplicates and adds all missing document titles to normas_personal

-- 1. Deduplicate existing entries (keeping the one with the smallest ID)
DELETE FROM public.normas_personal
WHERE id NOT IN (
    SELECT MIN(id)
    FROM public.normas_personal
    GROUP BY nombre_norma
);

-- 2. Insert missing titles extracted from migrations
INSERT INTO public.normas_personal (nombre_norma, tipo, activo, fecha_creacion)
SELECT title, 'Norma', true, CURRENT_DATE
FROM (
    VALUES 
    ('Administración del servicio de Vigilancia'),
    ('Almacenamiento en Tarimas'),
    ('Apertura y Cierre de CEDI'),
    ('Certificación Interna de Montacarguistas y Apiladores'),
    ('Control de Acceso a las Instalaciones'),
    ('Dotación de Equipos de Protecctión Personal'),
    ('Equipamiento de primeros Auxilios'),
    ('Evaluación de Agua potable'),
    ('Investigación de Accidentes Laborales'),
    ('Manejo Sistema CCTV'),
    ('Mantenimiento de la Planta Eléctrica'),
    ('Medición de seguridad, Orden  y Limpieza'),
    ('Norma  Reconocimiento por años de servicio'),
    ('Norma Apertura y Cierre de CEDI'),
    ('Norma Ascensos y Promociones'),
    ('Norma Capacitacion  del personal'),
    ('Norma Desincorporación de Colaboradores'),
    ('Norma Matríz de Crecimiento'),
    ('Norma Movilidad de Colaboradores'),
    ('Norma Programa de Pasantías'),
    ('Norma Suspensiones de Colaboradores'),
    ('Norma Teletrabajo'),
    ('Norma Transferencia de colaborador'),
    ('Norma para el Uso Seguro de Montacargas'),
    ('Plan de Seguridad y Salud Laboral'),
    ('Procediemiento Inducción a Colaboradores'),
    ('Procediemiento de Captacion de Personal'),
    ('Procedimiennto Aprobación de publicación de vacantes en proceso de captación'),
    ('Procedimiennto de capacitación del personal'),
    ('Procedimiento  Reconocimiento por años de servicio'),
    ('Procedimiento Actividades de bienestar al colaborador'),
    ('Procedimiento Administración de Remuneración Variable'),
    ('Procedimiento Administración de escala salarial'),
    ('Procedimiento Ascensos y Promociones'),
    ('Procedimiento Asociación Solidarista de las Empresas de Mayoreo en Costa Rica'),
    ('Procedimiento Assesment Center'),
    ('Procedimiento Beneficios del Colaborador'),
    ('Procedimiento Compensación salarial'),
    ('Procedimiento Comunicaciones internas al Colaborador'),
    ('Procedimiento Contratos de Trabajo a Colaboradores'),
    ('Procedimiento Descripcion de Cargos'),
    ('Procedimiento Desincorporación de Colaboradores'),
    ('Procedimiento Entrevista a Candidatos'),
    ('Procedimiento Estructuras Organizacionales'),
    ('Procedimiento Evaluacion de Competencias'),
    ('Procedimiento Evaluación de agua potable'),
    ('Procedimiento Exámen Pre-Empleo'),
    ('Procedimiento Gestión de Reconocimiento'),
    ('Procedimiento Gestión de Solicitudes de Personal en la Plataforma de Capital Humano'),
    ('Procedimiento Ingreso del colaborador'),
    ('Procedimiento Matríz de Crecimiento'),
    ('Procedimiento Movilidad de Colaboradores'),
    ('Procedimiento Oferta Salarial'),
    ('Procedimiento Programa de Pasantías'),
    ('Procedimiento Pruebas Psicotecnicas'),
    ('Procedimiento Retroalimentación para el Desarrollo'),
    ('Procedimiento Sucesión de Personal'),
    ('Procedimiento Teletrabajo'),
    ('Procedimiento Transferencia de colaborador'),
    ('Procedimiento Uso del Comedor de la Empresa'),
    ('Procedimiento Uso del Uniforme'),
    ('Procedimiento Vacaciones colaborador'),
    ('Procedimiento Viaticos de colaboradores'),
    ('Procedimiento de Requisición de personal'),
    ('Procedimiento suspenciones de colaboradores'),
    ('Procedimientos Gestión de Obligaciones Gubernamentales de Personal'),
    ('Procedimientos Préstamos a Colaboradores'),
    ('Protocolo de  Atención de personas accidentadas'),
    ('Protocolo de Vehiculos cargados para despacho'),
    ('Protocolo de respuestas ante Sismos'),
    ('Protocolo para Conato de Incendio'),
    ('Protocolo para continuidad operativa'),
    ('Protocolo para el manejo de Sustancias peligrosas'),
    ('Protocolo para la Inspeccion diaria de Montacargas'),
    ('Reporte del Colaborador de Accidentes Laborales'),
    ('Revisión de Camiones, Montacargas, Apiladores y Otros Vehículos de la Empresa'),
    ('Revisión del Sistema contra Incendio del Edificio'),
    ('Seguimiento de Gestión de Seguridad y Salud'),
    ('Seguridad Vehicular'),
    ('Sistema de Alarma'),
    ('Trabajo Alto Riesgo'),
    ('Uso de Lockers en Instalaciones de la Empresa'),
    ('Uso de equipos de protección Personal (EPP)'),
    ('Uso del Estacionamiento de la Empresa'),
    ('Uso seguro de Montacargas')
) AS t(title)
WHERE NOT EXISTS (
    SELECT 1 FROM public.normas_personal WHERE nombre_norma = t.title
);
