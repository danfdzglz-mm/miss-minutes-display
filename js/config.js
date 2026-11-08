/* =========================================================
   CONFIGURACIÓN DEL DISPLAY  (aquí se cambia lo visible sin tocar el código)
   ========================================================= */
window.CONFIG_DISPLAY = {
  // Textos de marca. Pongan aquí el nombre que quieran mostrar.
  marca: {
    titulo: "M.M. // DISPLAY",
    subtitulo: "SACRED TIMELINE MONITOR",
    pie: "MISS MINUTES DISPLAY · PROTOTIPO · DATOS DEMO",
  },

  // Imágenes propias (opcionales). Si el archivo no existe, se usa el respaldo:
  //   logo     -> el texto de "titulo" en un recuadro naranja
  //   mascota  -> un reloj abstracto animado
  // Pongan sus archivos en la carpeta img/ con estos nombres (PNG con fondo transparente se ve mejor).
  imagenes: {
    logo: "img/logo.png",
    mascota: "img/mascota.png",
  },

  // Formato de la hora: "12h" (AM/PM) o "24h"
  formatoHora: "12h",

  // Modo demo: usa datos de ejemplo y muestra una tarjeta temporal de prueba de vez en cuando.
  demo: true,
  demoTarjetaCadaSeg: 75,

  // Cuánto dura una tarjeta temporal en pantalla antes de volver al dashboard
  tarjetaSegundos: 18,

  // Mostrar la ayuda de teclas al abrir (se oculta sola a los 12 s; con "?" se vuelve a ver)
  mostrarAyuda: true,

  // Mover toda la imagen 1-2 px cada pocos minutos para que no se "queme" en pantallas OLED
  protegerPantalla: true,
};
