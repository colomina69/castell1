PRD - Plataforma de Gestión Digital: Filà Moros del Castell
1. Visión del Proyecto
La Plataforma de Gestión Digital surge como una solución integral para modernizar y centralizar la administración de la Filà Moros del Castell de Benilloba. El objetivo es facilitar el contacto con los socios, automatizar procesos financieros y de lotería, y ofrecer una presencia web premium que refleje la historia y valores de la Filà.

2. Púbico Objetivo
Socios: Miembros activos que necesitan consultar su estado, apuntarse a eventos y ver su historial de pagos.
Administradores (Junta): Personal encargado de la gestión diaria: altas/bajas, cobros de cuotas, gestión de lotería y organización de eventos.
Público General: Visitantes interesados en conocer la historia y actividades de la Filà.
3. Módulos Principales
3.1. Portal Público
Página de Inicio: Presentación de la Filà con diseño moderno y premium.
Historia: Línea del tiempo interactiva detallando los hitos de la Filà.
Galería: Espacio visual para fotos de eventos y desfiles.
Contacto: Formulario para consultas externas.
3.2. Sistema de Autenticación y Perfil
Acceso Restringido: Registro limitado exclusivamente a correos electrónicos presentes en la lista de socios_autorizados.
Perfiles de Usuario: Vinculación de cuentas de usuario con el registro de socio en la base de datos.
Dashboard del Socio: Visualización de cuotas pendientes, historial de pagos y eventos disponibles.
3.3. Gestión de Socios (Admin)
CRUD de Socios: Gestión completa de la información personal de cada miembro.
Control de Estado: Marcar socios como "Alta" o "Baja" para controlar el acceso y cobros.
Asignación de Roles: Diferenciación entre administradores y socios estándar.
3.4. Tesorería y Cobros
Gestión de Cuotas: Definición de diferentes tipos de cuotas anuales.
Generación Masiva: Opción de cargar la cuota anual a todos los socios activos en un solo clic.
Historial de Movimientos: Registro detallado de cada cobro o pago realizado, con filtros por concepto (Cuota, Lotería, Evento).
Dashboard de Tesorería: Resumen financiero para la toma de decisiones.
3.5. Gestión de Lotería
Sorteos: Creación de diferentes sorteos (Navidad, Niño, Mensual).
Asignaciones: Vinculación de décimos a socios específicos.
Cofinanciación: Integración automática de los cargos de lotería en el módulo de tesorería del socio.
3.6. Organización de Eventos
Creación de Eventos: Definición de fechas, ubicaciones, precios para socios e invitados, y fechas límite de inscripción.
Inscripciones: Los socios pueden apuntarse y añadir invitados desde su perfil.
Gestión de Cobros de Eventos: Generación de cargos financieros basados en las inscripciones confirmadas.
4. Stack Tecnológico
Frontend: Next.js (App Router) con TypeScript para un desarrollo robusto.
Estilos: Tailwind CSS con un enfoque en diseño "Premium" y móvil-primero.
Backend / DB / Auth: Supabase (PostgreSQL) aprovechando:
Row Level Security (RLS): Para proteger la privacidad de los datos de cada socio.
Auth: Para el manejo seguro de sesiones.
Storage: Para la galería de imágenes (pendiente de implementar/reforzar).
Iconografía: Lucide React.
5. Requerimientos No Funcionales
Seguridad: Los datos financieros y personales deben estar estrictamente protegidos por políticas RLS.
Responsividad: La interfaz de administración debe ser 100% funcional en dispositivos móviles para facilitar la gestión "en el sitio".
Estética: Diseño visual de alta fidelidad, utilizando gradientes, tipografía moderna y micro-animaciones.
6. Próximos Pasos / Roadmap
 Implementación de exportación de informes financieros (CSV/PDF).
 Mejora del sistema de notificaciones por email para eventos.
 Ampliación de la galería con carga directa de imágenes desde el móvil.
 Gráficos de proyección de flujo de caja en el dashboard de tesorería.

Comment
Ctrl+Alt+M
