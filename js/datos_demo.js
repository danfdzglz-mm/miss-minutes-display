/* =========================================================
   DATOS DE DEMOSTRACIÓN  ·  NO SON DATOS REALES
   Se calculan a partir de la hora actual para que siempre se vean "vigentes".
   Cuando exista la conexión con la app, la app mandará este mismo formato
   con MissMinutesDisplay.setDatos({...}) y este archivo dejará de usarse.
   ========================================================= */
(function () {
  var ahora = Date.now();
  var HORA = 3600 * 1000, DIA = 24 * HORA;

  window.DATOS_DEMO = {
    // Cuenta regresiva principal
    cuenta: {
      nombre: "EXPO INGENIERÍAS · DEMO",
      inicio: ahora - 25 * DIA,            // desde cuándo se cuenta (para la barra de avance)
      objetivo: ahora + 3 * DIA + 14 * HORA + 22 * 60 * 1000,
    },

    // Pendientes con deadline (los vencidos aparecen en rojo y abren una rama roja en la línea del tiempo)
    pendientes: [
      { tarea: "Reporte de control · Lab 4",   deadline: ahora + 5 * HORA + 12 * 60 * 1000, estado: "pendiente" },
      { tarea: "Cargar el teléfono",           deadline: ahora - 40 * 60 * 1000,            estado: "pendiente" },
      { tarea: "Brazos Mr. Bot · calibración", deadline: ahora + 1 * DIA + 3 * HORA,         estado: "pendiente" },
      { tarea: "Estudiar sistemas embebidos",  deadline: ahora + 2 * DIA + 7 * HORA,         estado: "pendiente" },
      { tarea: "Comprar filamento PLA",        deadline: ahora + 4 * DIA,                    estado: "hecha" },
    ],

    // Lo que dice el globo junto a la mascota (se van rotando)
    frases: [
      "Tic, tac, Dan. Ese reporte no se va a escribir solito.",
      "Respeta el deadline. Yo sí lo respeto.",
      "¿Otra vez el teléfono descargado? Ay, Dani, por favor.",
      "Todo en orden en la línea del tiempo… por ahora.",
    ],

    // Tarjetas temporales de ejemplo (lo que mostraría "investiga X y muéstramelo en el display")
    tarjetas: [
      {
        tipo: "REPORTE",
        titulo: "Resumen de prueba: noticias de IA",
        puntos: [
          "Ejemplo de tarjeta temporal: aquí irá el resumen que mande la app.",
          "Las respuestas largas se recortan a 3 o 4 puntos para leerse desde el sillón.",
          "Desaparece sola y regresa al dashboard.",
        ],
        fuente: "FUENTE: DATOS DE DEMOSTRACIÓN",
        meta: "SOLICITUD: VOZ\nORIGEN: APP\nPRIORIDAD: NORMAL",
      },
      {
        tipo: "RECORDATORIO",
        titulo: "Hora de cargar el teléfono",
        puntos: [
          "Batería por debajo del 50 % (dato de ejemplo).",
          "Conéctalo antes de dormir, Dan.",
        ],
        fuente: "FUENTE: DATOS DE DEMOSTRACIÓN",
        meta: "TIPO: AUTOMÁTICO\nORIGEN: APP\nPRIORIDAD: ALTA",
      },
    ],

    // Clima (la app lo manda desde Open-Meteo)
    clima: { temp: 18, sens: 17, min: 9, max: 24, lluvia: 10, desc: "Despejado", ciudad: "Durango" },

    // Horario de clases. dias = máscara (1 lunes, 2 martes, 4 miércoles, 8 jueves, 16 viernes, 32 sábado)
    // inicio / fin en minutos desde medianoche
    horario: [
      { materia: "Sistemas embebidos", salon: "A-204", dias: 1 | 4, inicio: 550, fin: 640 },
      { materia: "Control",            salon: "Lab 4", dias: 2 | 8, inicio: 420, fin: 510 },
      { materia: "Robótica",           salon: "B-110", dias: 1 | 4 | 16, inicio: 660, fin: 750 },
      { materia: "Ética",              salon: "C-301", dias: 16, inicio: 780, fin: 840 },
    ],
    primeraClase: { materia: "Sistemas embebidos", hora: ahora + 2 * HORA + 10 * 60 * 1000 },

    // Vista armada por Miss Minutes (en el display se ve con la tecla V hasta "bloques")
    visibles: ["reloj", "cuenta", "pendientes", "linea", "mascota", "clima"],

    bateria: 80,                 // % (demo)
    conexion: "demo",            // "demo" | "conectado" | "sin_conexion"
    asistente: "IDLE",           // IDLE | LISTENING | THINKING | SPEAKING | ERROR | NEXUS_ALERT
  };
})();
