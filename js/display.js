/* =========================================================
   MISS MINUTES · DISPLAY v2  —  lógica
   - Abierto en Chrome: funciona solo con datos demo (teclas de prueba).
   - En el Chromecast (receptor propio) o en la vista previa de la app: recibe los
     mensajes del teléfono con MissMinutesDisplay.recibir(msg):
       {tipo:"datos", datos:{…}}       pendientes, cuenta, clima, horario, primeraClase…
       {tipo:"modo", modo:"…"}         dashboard | hora | cronologia | agenda | cuenta |
                                       horario | buenosdias | emergencia | info
       {tipo:"tarjeta", tarjeta:{…}}   tarjeta temporal
       {tipo:"bloques", vista:{…}}     vista nueva armada por Miss Minutes
       {tipo:"nexus", activo, texto}   alerta Nexus
       {tipo:"asistente", estado}      IDLE | LISTENING | THINKING | SPEAKING | …
       {tipo:"estabilizar", tarea}     animación al completar una tarea
   ========================================================= */
(function () {
  "use strict";
  var CFG = window.CONFIG_DISPLAY || {};
  var $ = function (id) { return document.getElementById(id); };
  var pantalla = $("pantalla");

  var EN_CHROMECAST = /CrKey/i.test(navigator.userAgent);
  var EN_APP = EN_CHROMECAST || /[?&]preview=1/.test(location.search);
  var NAMESPACE = "urn:x-cast:com.missminutes.display";
  if (EN_APP) { CFG.demo = false; CFG.mostrarAyuda = false; CFG.demoTarjetaCadaSeg = 0; }

  var DIAS_ES = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
  var DIAS_EN = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  var DIAS_CORTO = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  var MODOS = ["dashboard", "hora", "cronologia", "agenda", "cuenta", "horario", "buenosdias"];

  var estado = {
    datos: null,
    modo: "dashboard",
    tarjetaTimer: null,
    ultimaTarjeta: null,
    ultimaVista: null,
    nexusManual: false,
    fraseIdx: 0,
    desplaz: { x: 0, y: 0 },
    escala: 1,
    tickVista: [],
  };

  var MAX_FILAS = 4;
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- escalar el escenario 1920×1080 a la pantalla ----------
  function escalar() {
    estado.escala = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    aplicarTransformacion();
  }
  function aplicarTransformacion() {
    pantalla.style.transform = "translate(" + estado.desplaz.x + "px," + estado.desplaz.y + "px) scale(" + estado.escala + ")";
  }
  window.addEventListener("resize", escalar);

  // ---------- marca e imágenes propias ----------
  function aplicarMarca() {
    var m = CFG.marca || {};
    document.querySelectorAll("[data-marca]").forEach(function (el) {
      var k = el.getAttribute("data-marca");
      if (m[k]) el.textContent = m[k];
    });
    var im = CFG.imagenes || {};
    cargarImagen($("logo-img"), im.logo, $("logo"));
    cargarImagen($("mascota-img"), im.mascota, document.querySelector(".mascota-caja"));
  }
  function cargarImagen(img, ruta, contenedor) {
    if (!ruta) return;
    img.onload = function () { contenedor.classList.add("con-imagen"); };
    img.onerror = function () { contenedor.classList.remove("con-imagen"); };
    img.src = ruta;
  }

  // ---------- reloj ----------
  function textoHora(d) {
    var h = d.getHours(), m = d.getMinutes();
    if (CFG.formatoHora !== "24h") { h = h % 12; if (h === 0) h = 12; }
    return (h < 10 ? " " + h : "" + h) + ":" + dos(m);
  }
  function horaCorta(d) {
    var h = d.getHours(), m = d.getMinutes();
    if (CFG.formatoHora === "24h") return dos(h) + ":" + dos(m);
    var pm = h >= 12; h = h % 12 || 12;
    return h + ":" + dos(m) + (pm ? " PM" : " AM");
  }
  function actualizarReloj() {
    var d = new Date();
    var t = textoHora(d);
    Segmentos.escribir($("reloj"), t);
    Segmentos.escribir($("reloj-gigante"), t);
    Segmentos.escribir($("reloj-seg"), dos(d.getSeconds()));
    var f = dos(d.getDate()) + "." + dos(d.getMonth() + 1) + "." + dos(d.getFullYear() % 100);
    Segmentos.escribir($("fecha"), f);
    Segmentos.escribir($("fecha2"), f);
    var pm = d.getHours() >= 12;
    var doce = CFG.formatoHora !== "24h";
    ["am", "am2"].forEach(function (id) { $(id).classList.toggle("activo", doce && !pm); $(id).style.display = doce ? "" : "none"; });
    ["pm", "pm2"].forEach(function (id) { $(id).classList.toggle("activo", doce && pm); $(id).style.display = doce ? "" : "none"; });
    $("dia").textContent = DIAS_ES[d.getDay()] + " // " + DIAS_EN[d.getDay()];
    $("pie-fecha").textContent = "DÍA " + diaDelAnio(d) + " · " + d.getFullYear();
    $("hora-mini").textContent = horaCorta(d);
    var ang = function (deg) { return "rotate(" + deg + " 50 50)"; };
    $("manecilla-h").setAttribute("transform", ang(((d.getHours() % 12) + d.getMinutes() / 60) * 30));
    $("manecilla-m").setAttribute("transform", ang((d.getMinutes() + d.getSeconds() / 60) * 6));
  }
  function diaDelAnio(d) { return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); }

  function textoCuenta(ms) {
    var s = Math.floor(Math.max(0, ms) / 1000);
    var dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    return dos(Math.min(dd, 99)) + ":" + dos(hh) + ":" + dos(mm) + ":" + dos(ss);
  }

  // ---------- cuenta regresiva ----------
  function actualizarCuenta() {
    var c = estado.datos && estado.datos.cuenta;
    var panel = $("panel-cuenta");
    if (!c) { $("cuenta-nombre").textContent = "SIN CUENTA REGRESIVA"; $("cuenta-meta").textContent = ""; Segmentos.escribir($("cuenta"), "  :  :  :  "); return; }
    var falta = Math.max(0, c.objetivo - Date.now());
    Segmentos.escribir($("cuenta"), textoCuenta(falta));
    $("cuenta-nombre").textContent = c.nombre;
    if (c.inicio && c.objetivo > c.inicio) {
      var avance = Math.min(1, Math.max(0, (Date.now() - c.inicio) / (c.objetivo - c.inicio)));
      $("cuenta-barra").style.width = (avance * 100).toFixed(1) + "%";
    }
    var obj = new Date(c.objetivo);
    $("cuenta-meta").textContent = "→ " + DIAS_CORTO[obj.getDay()] + " " + dos(obj.getDate()) + "." + dos(obj.getMonth() + 1) + " · " + horaCorta(obj);
    panel.classList.toggle("urgente", falta > 0 && falta < 3600 * 1000);
  }

  // ---------- pendientes ----------
  function textoFalta(ms) {
    var vencido = ms < 0;
    var s = Math.floor(Math.abs(ms) / 1000);
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    var t = d > 0 && !vencido ? d + "d " + dos(h) + "h" : dos(h + d * 24) + ":" + dos(m) + ":" + dos(s % 60);
    return (vencido ? "-" : "") + t;
  }
  /** Etiqueta según la fase que manda la app (o calculada en modo demo). */
  function etiqueta(p, ms) {
    if (p.estado === "hecha") return { txt: "DONE", cls: "" };
    var f = p.fase || "";
    if (f === "TEMPORAL EMERGENCY" || (!f && ms < 0)) return { txt: "VENCIDO", cls: "vencido" };
    if (f === "NEXUS ALERT") return { txt: "ALERTA", cls: "vencido" };
    if (f === "NEXUS POSSIBILITY") return { txt: "RIESGO", cls: "" };
    if (!p.deadline) return { txt: "S/F", cls: "" };
    if (!f && ms < 6 * 3600 * 1000) return { txt: "HOY", cls: "" };
    return { txt: "ON TRACK", cls: "" };
  }
  function pendientes() { return (estado.datos && estado.datos.pendientes) || []; }
  function ordenarPendientes(lista) {
    if (EN_APP) return lista.slice();   // la app ya los manda ordenados por urgencia
    return lista.slice().sort(function (a, b) {
      var ha = a.estado === "hecha" ? 1 : 0, hb = b.estado === "hecha" ? 1 : 0;
      if (ha !== hb) return ha - hb;
      return (a.deadline || 9e15) - (b.deadline || 9e15);
    });
  }
  function dibujarPendientes() {
    var tabla = $("tabla-pendientes");
    var todos = ordenarPendientes(pendientes());
    var lista = todos.slice(0, MAX_FILAS);
    tabla.innerHTML = "";
    if (!lista.length) tabla.innerHTML = '<div class="vacio">SIN PENDIENTES. LA LÍNEA TEMPORAL ESTÁ EN PAZ.</div>';
    lista.forEach(function (p, i) {
      var fila = document.createElement("div");
      fila.className = "fila";
      fila.style.animationDelay = (i * 0.08) + "s";
      var dl = p.deadline ? new Date(p.deadline) : null;
      fila.innerHTML =
        '<span class="num">' + dos(i + 1) + '</span><span class="tarea"></span>' +
        '<span class="deadline">' + (dl ? DIAS_CORTO[dl.getDay()] + " " + horaCorta(dl) : "—") + '</span>' +
        '<span class="falta"></span><span class="tag"></span>';
      fila.querySelector(".tarea").textContent = p.tarea;
      fila._p = p;
      tabla.appendChild(fila);
    });
    var abiertos = todos.filter(function (p) { return p.estado !== "hecha"; }).length;
    if (todos.length > MAX_FILAS) {
      var mas = document.createElement("div");
      mas.className = "mas-pendientes";
      mas.textContent = "+ " + (todos.length - MAX_FILAS) + " MÁS…";
      tabla.appendChild(mas);
    }
    $("contador-pendientes").textContent = abiertos + " ABIERTOS";
    actualizarPendientes();
  }
  function actualizarPendientes() {
    var primeraMarcada = false, hayAnomalia = false;
    document.querySelectorAll("#tabla-pendientes .fila").forEach(function (fila) {
      var p = fila._p;
      var ms = p.deadline ? p.deadline - Date.now() : 0;
      var e = etiqueta(p, ms);
      fila.querySelector(".falta").textContent = p.estado === "hecha" || !p.deadline ? "—" : textoFalta(ms);
      var tag = fila.querySelector(".tag");
      tag.textContent = e.txt;
      tag.className = "tag " + e.cls;
      var mala = p.estado !== "hecha" && (e.txt === "VENCIDO" || e.txt === "ALERTA");
      if (mala || e.txt === "RIESGO") hayAnomalia = true;
      fila.classList.toggle("vencida", mala);
      fila.classList.toggle("hecha", p.estado === "hecha");
      var resaltar = !primeraMarcada && p.estado !== "hecha" && !mala;
      fila.classList.toggle("primera", resaltar);
      if (resaltar) primeraMarcada = true;
    });
    var est = $("linea-estado");
    est.textContent = hayAnomalia ? "STATUS: VARIANCE DETECTED" : "STATUS: STABLE";
    est.classList.toggle("alerta", hayAnomalia);
  }

  // ---------- Sagrada Línea del Tiempo ----------
  function urgencia(p, ahora) {
    if (typeof p.urgencia === "number") return p.urgencia;
    if (!p.deadline || p.estado === "hecha") return 0;
    return p.deadline < ahora ? 1 : 0;
  }
  function dibujarLinea(svg, dias) {
    svg = svg || $("linea");
    var W = svg.clientWidth || 1600, H = svg.clientHeight || 140;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    var NS = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    var add = function (tag, attrs, txt) {
      var el = document.createElementNS(NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      if (txt) el.textContent = txt;
      svg.appendChild(el);
      return el;
    };
    var cy = H * 0.5;
    var ahora = Date.now(), DIA = 86400000;
    var t0 = ahora - 1.5 * DIA, t1 = ahora + (dias || 5.5) * DIA;
    var x = function (t) { return 40 + (W - 80) * (t - t0) / (t1 - t0); };
    var yPrincipal = function (px) { return cy + Math.sin(px / W * Math.PI * 3) * H * 0.07; };

    add("line", { x1: 0, y1: H * 0.16, x2: W, y2: H * 0.16, "class": "limite" });
    add("line", { x1: 0, y1: H * 0.84, x2: W, y2: H * 0.84, "class": "limite" });
    var d0 = new Date(t0); d0.setHours(0, 0, 0, 0);
    for (var t = d0.getTime() + DIA; t < t1; t += DIA) {
      var dx = x(t);
      add("line", { x1: dx, y1: H * 0.16, x2: dx, y2: H * 0.84, stroke: "rgba(255,138,31,0.12)", "stroke-width": 1 });
      var dd = new Date(t);
      add("text", { x: dx + 6, y: H - 4, "class": "marca-tiempo" }, DIAS_CORTO[dd.getDay()] + " " + dos(dd.getDate()));
    }
    var semilla = Math.floor(ahora / DIA);
    var rnd = function () { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
    for (var i = 0; i < 14; i++) {
      var bx = 60 + rnd() * (W - 160), by = yPrincipal(bx);
      var arriba = rnd() > 0.5 ? -1 : 1, largo = 120 + rnd() * 260, alto = (H * 0.18 + rnd() * H * 0.22) * arriba;
      add("path", { d: "M" + bx + "," + by + " C" + (bx + largo * 0.3) + "," + by + " " + (bx + largo * 0.6) + "," + (by + alto * 0.4) + " " + (bx + largo) + "," + (by + alto),
        "class": "rama", style: "animation-delay:" + (i * 0.12).toFixed(2) + "s;opacity:" + (0.35 + rnd() * 0.4).toFixed(2) });
    }
    var dPrin = "";
    for (var px = 0; px <= W; px += 8) dPrin += (px ? " L" : "M") + px + "," + yPrincipal(px).toFixed(1);
    add("path", { d: dPrin, "class": "principal" });

    // Tareas: ramas rojas proporcionales a la urgencia (crecen al acercarse la fecha límite)
    var lista = pendientes();
    lista.forEach(function (p, idx) {
      if (p.estado === "hecha" || !p.deadline) return;
      var px2 = x(Math.max(t0 + DIA * 0.05, Math.min(t1 - DIA * 0.05, p.deadline)));
      var py = yPrincipal(px2);
      var u = urgencia(p, ahora);
      if (u > 0) {
        var arriba2 = idx % 2 === 0 ? -1 : 1;
        var inicio = p.inicio ? p.deadline - (p.deadline - p.inicio) * 0.25 : p.deadline - DIA * 0.5;
        var xs = x(Math.max(t0, inicio));
        var alcance = H * (0.12 + 0.3 * u) * arriba2;
        add("path", { d: "M" + xs + "," + yPrincipal(xs) + " C" + (xs + (px2 - xs) * 0.4) + "," + yPrincipal(xs) + " " + (px2 - (px2 - xs) * 0.3) + "," + (py + alcance) + " " + (px2 + 40) + "," + (py + alcance),
          "class": "rama peligro", style: "opacity:" + (0.4 + 0.6 * u).toFixed(2) + ";stroke-width:" + (2 + 5 * u).toFixed(1) });
      }
      add("rect", { x: px2 - 6, y: py - 6, width: 12, height: 12, "class": "nodo" + (u >= 0.6 ? " peligro" : "") });
      if (dias && dias > 6 && idx < 8) {
        var dy = [-20, 34, -46, 60][idx % 4];
        add("text", { x: px2 + 10, y: py + dy, "class": "marca-tiempo", style: "fill:" + (u > 0 ? "#ff3b2e" : "#ffe7c2") }, String(p.tarea).slice(0, 22));
      }
    });
    var ax = x(ahora);
    add("line", { x1: ax, y1: H * 0.08, x2: ax, y2: H * 0.92, "class": "ahora" });
    add("text", { x: ax + 6, y: H * 0.14, "class": "marca-tiempo", fill: "#ffe7c2" }, "AHORA // NOW");

    var hoy = new Date();
    $("linea-mag").textContent = "TIMELINE MAG: " + dos(hoy.getMonth() + 1) + "." + dos(hoy.getDate()) + "." + (hoy.getFullYear() % 1000) + "." + dos(hoy.getHours());
    $("linea-seg").textContent = "SEGMENT: " + diaDelAnio(hoy) + "." + (lista.length * 37 % 1000);
  }

  // ---------- mascota, frases, estados ----------
  function rotarFrase() {
    var frases = (estado.datos && estado.datos.frases) || [];
    if (frases.length < 2) return;
    estado.fraseIdx = (estado.fraseIdx + 1) % frases.length;
    var g = $("globo");
    g.style.opacity = 0;
    setTimeout(function () { g.textContent = frases[estado.fraseIdx]; g.style.opacity = 1; }, 300);
  }
  function setAsistente(valor) {
    var el = $("asistente-estado");
    el.className = "asistente-estado " + valor;
    el.textContent = valor;
  }
  function setConexion(valor) {
    var el = $("enlace");
    el.className = "enlace " + valor;
    $("enlace-texto").textContent = { demo: "ENLACE: DEMO", conectado: "ENLACE: OK", sin_conexion: "SIN ENLACE" }[valor] || valor;
  }
  function setBateria(pct) { $("bateria-nivel").style.width = Math.max(4, Math.min(100, pct || 0)) + "%"; }
  function setClima(c) { $("clima-mini").textContent = c ? c.temp + "°C " + c.desc : ""; }

  /** Oculta paneles según "elementos visibles" de la app. */
  function aplicarVisibles(vis) {
    if (!vis) return;
    var mapa = { reloj: ".panel-reloj", cuenta: ".panel-cuenta", pendientes: ".panel-pendientes", linea: ".panel-linea", mascota: ".panel-mascota" };
    Object.keys(mapa).forEach(function (k) {
      var el = document.querySelector(mapa[k]);
      if (el) el.classList.toggle("oculto-por-config", vis.indexOf(k) < 0);
    });
    $("clima-mini").style.display = vis.indexOf("clima") < 0 ? "none" : "";
  }

  // =========================================================
  // Vistas extra
  // =========================================================
  function crearDigitos(patron, texto) {
    var d = document.createElement("div");
    d.className = "digitos";
    Segmentos.crear(d, patron);
    if (texto) Segmentos.escribir(d, texto);
    return d;
  }
  function panelHTML(etq, cuerpo, estilo) {
    return '<div class="v-panel"' + (estilo ? ' style="' + estilo + '"' : "") + '>' + (etq ? '<div class="v-etq">' + esc(etq) + '</div>' : "") + cuerpo + '</div>';
  }
  function tablaPendientes(lista, max) {
    var filas = "";
    var marcada = false;
    lista.slice(0, max).forEach(function (p, i) {
      var ms = p.deadline ? p.deadline - Date.now() : 0;
      var e = etiqueta(p, ms);
      var mala = e.txt === "VENCIDO" || e.txt === "ALERTA";
      var prim = !marcada && p.estado !== "hecha" && !mala;
      if (prim) marcada = true;
      var dl = p.deadline ? new Date(p.deadline) : null;
      filas += '<tr class="' + (prim ? "primera" : mala ? "vencida" : "") + '"><td>' + dos(i + 1) + "</td><td>" + esc(p.tarea) + "</td><td>" +
        (dl ? DIAS_CORTO[dl.getDay()] + " " + horaCorta(dl) : "—") + '</td><td class="v-falta" data-dl="' + (p.deadline || "") + '">' +
        (p.deadline ? textoFalta(ms) : "—") + '</td><td><span class="v-tag ' + (mala ? "rojo" : e.txt === "RIESGO" ? "ambar" : "") + '">' + e.txt + "</span></td></tr>";
    });
    if (!filas) filas = '<tr><td colspan="5">Sin pendientes. La línea temporal está en paz.</td></tr>';
    return '<table class="v-tabla"><tr><th>#</th><th>TAREA</th><th>DEADLINE</th><th>TIME LEFT</th><th>STATUS</th></tr>' + filas + "</table>";
  }
  function tickFaltas(cont) {
    cont.querySelectorAll(".v-falta").forEach(function (td) {
      var dl = Number(td.getAttribute("data-dl"));
      if (dl) td.textContent = textoFalta(dl - Date.now());
    });
  }

  function vistaHorario(v) {
    var h = (estado.datos && estado.datos.horario) || [];
    var hoy = new Date().getDay();             // 0 = domingo
    var dias = [1, 2, 3, 4, 5];
    if (h.some(function (c) { return c.dias & 32; })) dias.push(6);
    var html = '<div class="v-titulo">HORARIO // SCHEDULE</div><div class="v-horario" style="grid-template-columns:repeat(' + dias.length + ',1fr)">';
    dias.forEach(function (d) {
      var bit = 1 << (d - 1);
      var clases = h.filter(function (c) { return c.dias & bit; }).sort(function (a, b) { return a.inicio - b.inicio; });
      html += '<div class="v-dia' + (d === hoy ? " hoy" : "") + '"><h3>' + DIAS_ES[d].slice(0, 3) + "</h3>";
      clases.forEach(function (c) {
        var cancel = d === hoy && c.canceladaHoy;
        html += '<div class="v-clase' + (cancel ? " cancelada" : "") + '">' + esc(c.materia) + "<small>" + minHora(c.inicio) + "–" + minHora(c.fin) + (c.salon ? " · " + esc(c.salon) : "") + "</small></div>";
      });
      if (!clases.length) html += '<div class="v-sub">LIBRE</div>';
      html += "</div>";
    });
    v.innerHTML = html + "</div>";
  }
  function minHora(m) { var d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return horaCorta(d); }

  function vistaBuenosDias(v) {
    var d = estado.datos || {};
    var c = d.clima;
    var pc = d.primeraClase;
    v.innerHTML = '<div class="v-titulo">BUENOS DÍAS // GOOD MORNING</div><div class="v-fila" style="flex:0 0 360px">' +
      panelHTML("HORA", '<div class="v-dig"><div class="v-grande" id="bd-reloj"></div></div>') +
      panelHTML(pc ? "FALTA PARA " + String(pc.materia).toUpperCase() : "SIN CLASES HOY", pc ? '<div class="v-dig"><div class="v-medio" id="bd-cuenta"></div><div class="v-unidades"><span>HRS</span><span>MIN</span><span>SEG</span></div></div>' : '<div class="v-texto">Día libre.</div>') +
      "</div><div class=\"v-fila\">" +
      panelHTML("PENDIENTES DE HOY", tablaPendientes(pendientes().filter(function (p) {
        return p.estado !== "hecha" && p.deadline && p.deadline < new Date().setHours(23, 59, 59, 999);
      }), 5)) +
      panelHTML("CLIMA", c ? '<div class="v-clima-grande">' + c.temp + '°</div><div class="v-texto">' + esc(c.desc) + "<br>MÍN " + c.min + "° · MÁX " + c.max + "°<br>LLUVIA " + c.lluvia + "%</div>" : '<div class="v-texto">Sin datos de clima.</div>', "flex:0 0 520px") +
      "</div>";
    var rel = crearDigitos("88:88"); $("bd-reloj").appendChild(rel);
    var cu = pc ? crearDigitos("88:88:88") : null; if (cu) $("bd-cuenta").appendChild(cu);
    estado.tickVista.push(function () {
      Segmentos.escribir(rel, textoHora(new Date()));
      if (cu) {
        var s = Math.max(0, Math.floor((pc.hora - Date.now()) / 1000));
        Segmentos.escribir(cu, dos(Math.min(99, Math.floor(s / 3600))) + ":" + dos(Math.floor(s % 3600 / 60)) + ":" + dos(s % 60));
      }
      tickFaltas(v);
    });
  }

  function vistaCuenta(v) {
    var d = estado.datos || {};
    var f = d.enfoque, c = d.cuenta;
    var nombre = f ? "ENFOQUE · " + (f.tema || "ESTUDIO").toUpperCase() : c ? c.nombre : "SIN CUENTA REGRESIVA";
    var objetivo = f ? f.fin : c ? c.objetivo : 0;
    var inicio = c && !f ? c.inicio : 0;
    v.innerHTML = '<div class="v-titulo">' + esc(nombre) + '</div>' +
      panelHTML(objetivo ? "→ " + DIAS_CORTO[new Date(objetivo).getDay()] + " " + horaCorta(new Date(objetivo)) : "",
        '<div class="v-dig"><div class="v-grande" id="vc-dig"></div><div class="v-unidades"><span>DÍAS</span><span>HRS</span><span>MIN</span><span>SEG</span></div></div>' +
        (inicio ? '<div class="v-barra"><div id="vc-barra" style="width:0%"></div></div>' : ""), "justify-content:center");
    var dig = crearDigitos("88:88:88:88"); $("vc-dig").appendChild(dig);
    estado.tickVista.push(function () {
      Segmentos.escribir(dig, objetivo ? textoCuenta(objetivo - Date.now()) : "  :  :  :  ");
      var b = $("vc-barra");
      if (b && inicio) b.style.width = (Math.min(1, Math.max(0, (Date.now() - inicio) / (objetivo - inicio))) * 100).toFixed(1) + "%";
    });
  }

  function vistaCronologia(v) {
    var lista = pendientes().filter(function (p) { return p.estado !== "hecha"; });
    var anom = lista.filter(function (p) { return (p.urgencia || 0) > 0; });
    v.innerHTML = '<div class="v-titulo">SAGRADA LÍNEA DEL TIEMPO</div>' +
      panelHTML("TIMELINE // PRÓXIMOS 10 DÍAS", '<svg id="vl-linea" class="linea-tva" style="flex:1;width:100%;min-height:0"></svg>') +
      '<div class="v-fila" style="flex:0 0 220px">' + panelHTML("ANOMALÍAS", anom.length ? '<ul class="v-lista">' + anom.slice(0, 4).map(function (p) { return "<li>" + esc(p.tarea) + " · " + etiqueta(p, p.deadline - Date.now()).txt + "</li>"; }).join("") + "</ul>" : '<div class="v-texto">Ninguna. Línea temporal estable.</div>') + "</div>";
    setTimeout(function () { dibujarLinea($("vl-linea"), 10); }, 30);
  }

  function vistaAgenda(v) {
    v.innerHTML = '<div class="v-titulo">AGENDA // TASKS</div>' + panelHTML(null, tablaPendientes(pendientes(), 9));
    estado.tickVista.push(function () { tickFaltas(v); });
  }

  /** Vista libre armada por Miss Minutes con bloques. */
  function vistaBloques(v, vista) {
    vista = vista || estado.ultimaVista || { titulo: "SIN VISTA", bloques: [] };
    var html = '<div class="v-titulo">' + esc(String(vista.titulo || "MISS MINUTES").toUpperCase()) + "</div>";
    var bloques = (vista.bloques || []).slice(0, 6);
    var filas = bloques.length <= 3 ? [bloques] : [bloques.slice(0, Math.ceil(bloques.length / 2)), bloques.slice(Math.ceil(bloques.length / 2))];
    var pendientesDig = [];
    filas.forEach(function (fila) {
      html += '<div class="v-fila">';
      fila.forEach(function (b, i) {
        var id = "vb-" + Math.random().toString(36).slice(2, 8);
        var cuerpo = "";
        var val = b.valor;
        switch (String(b.tipo || "texto")) {
          case "lista": cuerpo = '<ul class="v-lista">' + (val || []).slice(0, 6).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; break;
          case "numero": cuerpo = '<div class="v-dig"><div class="v-medio" id="' + id + '"></div>' + (b.unidad ? '<div class="v-sub" style="text-align:center">' + esc(b.unidad) + "</div>" : "") + "</div>"; pendientesDig.push({ id: id, tipo: "numero", val: val }); break;
          case "cuenta": cuerpo = '<div class="v-dig"><div class="v-medio" id="' + id + '"></div><div class="v-unidades"><span>DÍAS</span><span>HRS</span><span>MIN</span><span>SEG</span></div></div>'; pendientesDig.push({ id: id, tipo: "cuenta", val: val }); break;
          case "barra":
            var max = (val && val.max) || 100, actual = (val && val.valor != null) ? val.valor : Number(val) || 0;
            cuerpo = '<div class="v-clima-grande" style="font-size:90px">' + Math.round(actual / max * 100) + '%</div><div class="v-barra"><div style="width:' + Math.min(100, actual / max * 100) + '%"></div></div>'; break;
          case "grafica":
            var datos = (val || []).slice(0, 10), mx = Math.max.apply(null, datos.map(function (x) { return Number(x.valor) || 0; }).concat([1]));
            cuerpo = '<div class="v-graf">' + datos.map(function (x) { return '<div class="b"><span>' + esc(x.valor) + '</span><div style="height:' + ((Number(x.valor) || 0) / mx * 85).toFixed(0) + '%"></div><span>' + esc(x.etiqueta) + "</span></div>"; }).join("") + "</div>"; break;
          case "tabla":
            var t = (val || []).slice(0, 8);
            cuerpo = '<table class="v-tabla">' + t.map(function (r, ri) { return "<tr>" + (r || []).map(function (c) { return ri === 0 ? "<th>" + esc(c) + "</th>" : "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>"; break;
          default: cuerpo = '<div class="v-texto">' + esc(val) + "</div>";
        }
        html += panelHTML(b.titulo || "", cuerpo);
      });
      html += "</div>";
    });
    v.innerHTML = html;
    pendientesDig.forEach(function (p) {
      var cont = document.getElementById(p.id);
      if (!cont) return;
      if (p.tipo === "numero") {
        var txt = String(p.val == null ? "" : p.val).replace(/[^0-9.\-: ]/g, "").slice(0, 8) || "0";
        cont.appendChild(crearDigitos(txt.replace(/[0-9\- ]/g, "8"), txt));
      } else {
        var objetivo = typeof p.val === "number" ? p.val : Date.parse(p.val);
        var dg = crearDigitos("88:88:88:88");
        cont.appendChild(dg);
        estado.tickVista.push(function () { Segmentos.escribir(dg, isNaN(objetivo) ? "  :  :  :  " : textoCuenta(objetivo - Date.now())); });
      }
    });
  }

  function mostrarVista(modo) {
    var v = $("vista");
    estado.tickVista = [];
    pantalla.classList.add("con-vista");
    pantalla.classList.remove("modo-hora");
    if (modo === "horario") vistaHorario(v);
    else if (modo === "buenosdias") vistaBuenosDias(v);
    else if (modo === "cuenta") vistaCuenta(v);
    else if (modo === "cronologia") vistaCronologia(v);
    else if (modo === "agenda") vistaAgenda(v);
    else if (modo === "bloques") vistaBloques(v);
    estado.tickVista.forEach(function (f) { f(); });
    ajustarDigitos(v);
  }

  /** Reduce los dígitos de 7 segmentos que no caben en su panel. */
  function ajustarDigitos(v) {
    v.querySelectorAll(".digitos").forEach(function (d) {
      var panel = d.closest(".v-panel");
      if (!panel) return;
      d.style.fontSize = "";
      var max = panel.clientWidth - 70, ancho = d.scrollWidth;
      if (ancho > max && ancho > 0) d.style.fontSize = Math.floor(parseFloat(getComputedStyle(d).fontSize) * max / ancho) + "px";
    });
  }

  // ---------- modos ----------
  function setModo(modo) {
    modo = modo || "dashboard";
    estado.modo = modo;
    ocultarTarjeta();
    if (modo !== "emergencia" && !estado.nexusManual) $("capa-nexus").classList.remove("visible");
    if (modo === "dashboard" || modo === "hora") {
      pantalla.classList.remove("con-vista");
      estado.tickVista = [];
      pantalla.classList.toggle("modo-hora", modo === "hora");
      if (modo === "dashboard") setTimeout(function () { dibujarLinea(); }, 50);
    } else if (modo === "info") {
      pantalla.classList.remove("con-vista", "modo-hora");
      if (estado.ultimaTarjeta) mostrarTarjeta(estado.ultimaTarjeta, true);
    } else if (modo === "emergencia") {
      pantalla.classList.remove("con-vista", "modo-hora");
      var a = estado.datos && estado.datos.anomalia;
      nexusVisual(true, a ? a.tarea + " · " + a.fase : "SIN ANOMALÍAS ACTIVAS");
    } else {
      mostrarVista(modo);
    }
  }

  // ---------- tarjeta temporal ----------
  function mostrarTarjeta(t, fija) {
    if (!t) return;
    estado.ultimaTarjeta = t;
    $("tarjeta-tipo").textContent = t.tipo || "REPORTE";
    $("tarjeta-titulo").textContent = t.titulo || "";
    $("tarjeta-meta").textContent = t.meta || "";
    $("tarjeta-fuente").textContent = t.fuente || "";
    var ul = $("tarjeta-lista");
    ul.innerHTML = "";
    (t.puntos || []).slice(0, 4).forEach(function (p) { var li = document.createElement("li"); li.textContent = p; ul.appendChild(li); });
    var seg = t.segundos || CFG.tarjetaSegundos || 18;
    var barra = $("tarjeta-barra");
    barra.style.transition = "none";
    barra.style.width = fija ? "100%" : "0%";
    $("capa-tarjeta").classList.add("visible");
    clearTimeout(estado.tarjetaTimer);
    if (fija) return;
    setTimeout(function () { barra.style.transition = "width " + seg + "s linear"; barra.style.width = "100%"; }, 60);
    estado.tarjetaTimer = setTimeout(ocultarTarjeta, seg * 1000);
  }
  function ocultarTarjeta() { $("capa-tarjeta").classList.remove("visible"); clearTimeout(estado.tarjetaTimer); }

  // ---------- alerta nexus ----------
  function nexusVisual(activo, texto) {
    $("nexus-texto").textContent = texto || "VARIANTE FUERA DE LA LÍNEA DEL TIEMPO";
    $("capa-nexus").classList.toggle("visible", !!activo);
  }
  function nexus(activo, texto) {
    estado.nexusManual = !!activo;
    nexusVisual(activo, texto);
    if (activo) setAsistente("NEXUS_ALERT");
    else setAsistente((estado.datos && estado.datos.asistente) || "IDLE");
  }

  function estabilizar(tarea) {
    var a = $("aviso-estable");
    a.textContent = "LÍNEA TEMPORAL ESTABILIZADA" + (tarea ? " · " + String(tarea).toUpperCase().slice(0, 28) : "");
    a.classList.add("visible");
    setTimeout(function () { a.classList.remove("visible"); }, 3500);
  }

  // ---------- datos ----------
  function setDatos(d) {
    estado.datos = d || {};
    if (estado.datos.titulo) document.querySelectorAll('[data-marca="titulo"]').forEach(function (el) { el.textContent = estado.datos.titulo; });
    dibujarPendientes();
    if (estado.modo === "dashboard") dibujarLinea();
    actualizarCuenta();
    setConexion(estado.datos.conexion || "demo");
    setAsistente(estado.datos.asistente || "IDLE");
    setBateria(estado.datos.bateria);
    setClima(estado.datos.clima);
    aplicarVisibles(estado.datos.visibles);
    var frases = estado.datos.frases || [];
    if (frases.length) $("globo").textContent = frases[0];
    if (pantalla.classList.contains("con-vista")) mostrarVista(estado.modo);
    if (estado.modo === "emergencia") setModo("emergencia");
  }

  /** Punto de entrada único para mensajes del teléfono (Cast o vista previa). */
  function recibir(msg) {
    if (typeof msg === "string") { try { msg = JSON.parse(msg); } catch (e) { return; } }
    if (!msg || !msg.tipo) return;
    switch (msg.tipo) {
      case "datos": setDatos(msg.datos); break;
      case "modo": setModo(msg.modo); break;
      case "tarjeta": mostrarTarjeta(msg.tarjeta); break;
      case "bloques": estado.ultimaVista = msg.vista; setModo("bloques"); break;
      case "nexus": nexus(msg.activo, msg.texto); break;
      case "asistente": setAsistente(msg.estado); break;
      case "conexion": setConexion(msg.valor); break;
      case "estabilizar": estabilizar(msg.tarea); break;
    }
  }

  // ---------- receptor de Chromecast ----------
  function iniciarReceptor() {
    var s = document.createElement("script");
    s.src = "https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js";
    s.onload = function () {
      try {
        var ctx = cast.framework.CastReceiverContext.getInstance();
        ctx.addCustomMessageListener(NAMESPACE, function (ev) { recibir(ev.data); });
        var opts = new cast.framework.CastReceiverOptions();
        opts.customNamespaces = {};
        opts.customNamespaces[NAMESPACE] = cast.framework.system.MessageType.JSON;
        opts.disableIdleTimeout = true;
        opts.skipPlayersLoad = true;
        ctx.start(opts);
        setConexion("conectado");
      } catch (e) { console.error("Receptor Cast", e); }
    };
    document.head.appendChild(s);
  }

  // ---------- teclas de prueba ----------
  var estadosAsistente = ["IDLE", "LISTENING", "THINKING", "SPEAKING", "ERROR"];
  var estadosConexion = ["demo", "conectado", "sin_conexion"];
  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (k === "t") {
      var ts = (estado.datos && estado.datos.tarjetas) || [];
      if ($("capa-tarjeta").classList.contains("visible")) ocultarTarjeta();
      else if (ts.length) mostrarTarjeta(ts[Math.floor(Math.random() * ts.length)]);
    } else if (k === "h") setModo("hora");
    else if (k === "d") { setModo("dashboard"); nexus(false); }
    else if (k === "v") setModo(MODOS[(MODOS.indexOf(estado.modo) + 1) % MODOS.length]);
    else if (k === "n") nexus(!estado.nexusManual);
    else if (k === "c") {
      var actual = $("enlace").className.replace("enlace ", "");
      setConexion(estadosConexion[(estadosConexion.indexOf(actual) + 1) % estadosConexion.length]);
    } else if (k === "a") {
      var a = $("asistente-estado").textContent;
      setAsistente(estadosAsistente[(estadosAsistente.indexOf(a) + 1) % estadosAsistente.length]);
    } else if (k === "f") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    } else if (k === "?" || k === "/") $("ayuda").classList.toggle("oculta");
  });

  // ---------- arranque ----------
  function arrancar() {
    escalar();
    aplicarMarca();
    Segmentos.crear($("reloj"), "88:88");
    Segmentos.crear($("reloj-gigante"), "88:88");
    Segmentos.crear($("reloj-seg"), "88");
    Segmentos.crear($("fecha"), "88.88.88");
    Segmentos.crear($("fecha2"), "88.88.88");
    Segmentos.crear($("cuenta"), "88:88:88:88");
    $("reloj").classList.add("colon-parpadea");
    $("reloj-gigante").classList.add("colon-parpadea");
    var g = document.querySelector("#mascota-respaldo .marcas");
    for (var i = 0; i < 12; i++) {
      var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      var largo = i % 3 === 0 ? 9 : 5;
      l.setAttribute("x1", 50); l.setAttribute("y1", 9); l.setAttribute("x2", 50); l.setAttribute("y2", 9 + largo);
      l.setAttribute("transform", "rotate(" + (i * 30) + " 50 50)");
      g.appendChild(l);
    }

    setDatos(CFG.demo !== false ? window.DATOS_DEMO : { conexion: EN_APP ? "conectado" : "sin_conexion", frases: ["Esperando datos del teléfono…"] });
    actualizarReloj();
    if (EN_CHROMECAST) iniciarReceptor();

    var pasos = ["INICIANDO SISTEMA…", "CARGANDO LÍNEA TEMPORAL…", "SINCRONIZANDO PENDIENTES…", "LISTO."];
    var barra = $("arranque-barra");
    var pausa = EN_APP && !EN_CHROMECAST ? 150 : 600;
    pasos.forEach(function (txt, i) {
      setTimeout(function () { $("arranque-texto").textContent = txt; barra.style.width = ((i + 1) / pasos.length * 100) + "%"; }, i * pausa);
    });
    setTimeout(function () { pantalla.classList.remove("arrancando"); if (estado.modo === "dashboard") dibujarLinea(); }, pasos.length * pausa + 200);

    setInterval(function () {
      actualizarReloj();
      actualizarCuenta();
      actualizarPendientes();
      estado.tickVista.forEach(function (f) { try { f(); } catch (e) { } });
    }, 1000);
    setInterval(rotarFrase, 20000);
    setInterval(function () { if (estado.modo === "dashboard") dibujarLinea(); }, 10 * 60 * 1000);
    if (CFG.demo !== false && CFG.demoTarjetaCadaSeg) {
      setInterval(function () {
        var ts = (estado.datos && estado.datos.tarjetas) || [];
        if (ts.length && estado.modo === "dashboard" && !estado.nexusManual) mostrarTarjeta(ts[Math.floor(Math.random() * ts.length)]);
      }, CFG.demoTarjetaCadaSeg * 1000);
    }
    if (CFG.protegerPantalla) {
      setInterval(function () {
        estado.desplaz = { x: Math.round(Math.random() * 4 - 2), y: Math.round(Math.random() * 4 - 2) };
        aplicarTransformacion();
      }, 3 * 60 * 1000);
    }
    if (CFG.mostrarAyuda === false) $("ayuda").classList.add("oculta");
    else setTimeout(function () { $("ayuda").classList.add("oculta"); }, 12000);
    $("pie-coord").textContent = "0231.47 // " + (100000 + diaDelAnio(new Date()) * 997);
  }

  window.MissMinutesDisplay = {
    recibir: recibir,
    setDatos: setDatos,
    mostrarTarjeta: mostrarTarjeta,
    ocultarTarjeta: ocultarTarjeta,
    setModo: setModo,
    setConexion: setConexion,
    setAsistente: setAsistente,
    nexus: nexus,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
})();
