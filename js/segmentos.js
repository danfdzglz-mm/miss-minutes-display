/* =========================================================
   DÍGITOS DE 7 SEGMENTOS (dibujados en SVG, se ven nítidos a cualquier tamaño)
   Muestran los segmentos apagados muy tenues, como un display real.
   ========================================================= */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  // Segmentos a-g en un dígito de 60×100, con un poco de inclinación.
  var SEGS = {
    a: "10,2 50,2 44,10 16,10",
    b: "52,4 52,48 46,44 46,12",
    c: "52,52 52,96 46,88 46,56",
    d: "10,98 50,98 44,90 16,90",
    e: "8,52 14,56 14,88 8,96",
    f: "8,4 14,12 14,44 8,48",
    g: "12,50 16,46 44,46 48,50 44,54 16,54",
  };
  var MAPA = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
    "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcfgd", "-": "g", " ": "",
  };

  function digito() {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 60 100");
    svg.setAttribute("class", "dig");
    svg.style.transform = "skewX(-6deg)";
    for (var k in SEGS) {
      var p = document.createElementNS(NS, "polygon");
      p.setAttribute("points", SEGS[k]);
      p.setAttribute("class", "seg off");
      p.dataset.s = k;
      svg.appendChild(p);
    }
    return svg;
  }

  function separador(tipo) {
    var svg = document.createElementNS(NS, "svg");
    var dosPuntos = tipo === ":";
    svg.setAttribute("viewBox", dosPuntos ? "0 0 20 100" : "0 0 16 100");
    svg.setAttribute("class", dosPuntos ? "dos-puntos" : "punto");
    var ys = dosPuntos ? [30, 70] : [94];
    ys.forEach(function (y) {
      var r = document.createElementNS(NS, "rect");
      r.setAttribute("x", dosPuntos ? 5 : 3);
      r.setAttribute("y", y - 5);
      r.setAttribute("width", 10);
      r.setAttribute("height", 10);
      r.setAttribute("class", "punto-seg");
      svg.appendChild(r);
    });
    return svg;
  }

  /** Prepara un contenedor con un "patrón", p. ej. "88:88" o "88.88.88". */
  function crear(contenedor, patron) {
    contenedor.innerHTML = "";
    var celdas = [];
    for (var i = 0; i < patron.length; i++) {
      var c = patron[i];
      if (c === ":" || c === ".") {
        contenedor.appendChild(separador(c));
        celdas.push(null);
      } else {
        var d = digito();
        contenedor.appendChild(d);
        celdas.push(d);
      }
    }
    contenedor._celdas = celdas;
  }

  /** Escribe un texto del mismo largo que el patrón ("09:41"). Espacios = dígito apagado. */
  function escribir(contenedor, texto) {
    var celdas = contenedor._celdas || [];
    for (var i = 0; i < celdas.length; i++) {
      var d = celdas[i];
      if (!d) continue;
      var on = MAPA[texto[i]] || "";
      var polys = d.childNodes;
      for (var j = 0; j < polys.length; j++) {
        var encendido = on.indexOf(polys[j].dataset.s) >= 0;
        polys[j].setAttribute("class", encendido ? "seg" : "seg off");
      }
    }
  }

  window.Segmentos = { crear: crear, escribir: escribir };
})();
