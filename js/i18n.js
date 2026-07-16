/* ============================================================
   Lucid — EN ⇄ ES translation engine
   Default language is always English. Choice persists in
   localStorage and is re-applied on every page.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Leaf-text dictionary (English text → Spanish) ----------
     Applied to "simple" elements where the visible text is a direct text
     node: nav links, chips, tags, eyebrow labels, marquee words, filters.
     Inline children (svg sparks, count badges) are left untouched. */
  var TEXT = {
    /* nav + footer nav */
    "About": "Nosotros",
    "Services": "Servicios",
    "Portfolio": "Portafolio",
    "Testimonials": "Testimonios",
    "Contact": "Contacto",

    /* eyebrow labels */
    "About us": "Acerca de nosotros",
    "What we do": "Lo que hacemos",
    "Our work": "Nuestro trabajo",
    "What our clients say": "Lo que dicen nuestros clientes",
    "Start a project": "Inicia un proyecto",

    /* marquee + service terms */
    "Web Design": "Diseño web",
    "Brand Identity": "Identidad de marca",
    "Motion & Visuals": "Movimiento y visuales",
    "Creative Direction": "Dirección creativa",
    "Web Production": "Producción web",

    /* chips */
    "Responsive web design": "Diseño web responsivo",
    "Immersive visuals": "Visuales inmersivos",
    "Built for client engagement": "Diseñado para fidelizar clientes",
    "Search Engine Optimization": "Optimización para motores de búsqueda",
    "Logo design": "Diseño de logotipo",
    "Logo Design": "Diseño de logotipo",
    "Visual identity": "Identidad visual",
    "Social media kit": "Kit de redes sociales",
    "Marketing materials": "Materiales de marketing",
    "Icons & illustrations": "Iconos e ilustraciones",
    "Banners & ads": "Banners y anuncios",
    "UI animation": "Animación de UI",

    /* case tags */
    "International Non-Profit": "ONG internacional",
    "PREMIUM AUTO CARE": "CUIDADO AUTOMOTRIZ PREMIUM",
    "Premium Auto Care": "Cuidado automotriz premium",
    "Artesanal Snacks": "Snacks artesanales",
    "Financial Consulting": "Consultoría financiera",

    /* testimonial roles */
    "Founder, Flor Tierra": "Fundadora, Flor Tierra",
    "Coordinator, UNbound Youth Initiative": "Coordinador, UNbound Youth Initiative",
    "Independent Novelist": "Novelista independiente",
    "Event Organizer": "Organizador de eventos",

    /* works filter buttons */
    "Explore all": "Ver todo"
  };

  /* Selectors whose direct text nodes get the leaf-text treatment. */
  var TEXT_SCOPE =
    ".nav-links a, .foot-nav a, .chip, .case-tag, .t-cite .biz, " +
    ".eyebrow-row, .m-reg, .m-acc, .works-filter button, .works-title";

  /* ---------- Rich-HTML entries (innerHTML swap) ----------
     [ selector, indexOrNull, spanishHTML ]
     indexOrNull === null → first match. */
  var COMMON = [
    [".nav-cta", null, 'Contacto <span class="arrow">↗</span>'],
    [".foot-bottom span", 0, "© Lucid 2026. Todos los derechos reservados."],
    [".foot-bottom span", 1, "Pequeños negocios, grandes ideas."],

    /* portfolio cases (same order + markup on both pages) */
    [".case h3", 0, "<em>UNbound</em> Youth Initiative"],
    [".case h3", 1, "<em>CarWash</em> MX"],
    [".case h3", 2, "<em>Flor</em> Tierra"],
    [".case h3", 3, "<em>Abimerhi</em> Consultores"],
    [".case-desc", 0, "Un sitio web e identidad de marca que escaló su proyecto estudiantil hasta convertirlo en un movimiento global."],
    [".case-desc", 1, "Un hogar digital que tomó un negocio de una sola sede y le dio una experiencia de cliente que impulsa la retención."],
    [".case-desc", 2, "Una marca mexicana de snacks caseros con una tienda en línea tan saludable como sus ingredientes."],
    [".case-desc", 3, "Una firma de consultoría mexicana elevada por una presencia digital imponente, creada para ganar confianza desde el primer instante."]
  ];

  var INDEX = [
    [".hero-eyebrow .eyebrow-row > span", null, "Lucid Studio — Pequeños negocios, grandes ideas"],
    [".hero-headline", null,
      '<span class="line"><span class="word" style="font-family: &quot;Cormorant Garamond&quot;; font-weight: 600">¿Tienes</span> <span class="word" style="font-family: &quot;Cormorant Garamond&quot;; font-weight: 600">una</span> <span class="word"><em class="accent">visión?</em></span></span>' +
      '<span class="line" style="font-family: &quot;Cormorant Garamond&quot;; font-weight: 600"><span class="word">Démosle</span> <span class="word"><em class="accent">enfoque.</em></span></span>'],
    [".hero-sub", null, "Diseño web e identidad de marca con una presencia creativa que tus clientes no podrán olvidar."],
    [".hero-inner .btn", null, 'Agenda una consulta gratis <span class="arrow">↗</span>'],

    [".about-quote", null,
      '<span class="aq-line" data-build>La <span class="rui">marca digital</span> correcta puede cambiar</span> ' +
      '<span class="aq-line" data-build><span class="rui">todo</span> para un pequeño negocio.</span>'],
    [".about-body p", null, "Nos sumergimos en la identidad de tu marca, combinando precisión técnica y un diseño imaginativo y deslumbrante para cautivar a tus usuarios. Las empresas que priorizan la experiencia web del cliente reportan un 60% más de ganancias. Por eso, Lucid hace que tu primera impresión sea innegable, con una UI/UX impactante y fluida que convierte a los visitantes nuevos en clientes duraderos."],
    [".about-cta", null, 'Inicia tu proyecto <span class="arrow">↗</span>'],

    [".services-left h2", null, 'Tres oficios. <em class="rui">Un estudio.</em>'],
    [".svc-row h3", 0, "Producción <em>web</em>"],
    [".svc-row h3", 1, "Identidad de <em>marca</em>"],
    [".svc-row h3", 2, "<em>Movimiento</em> y visuales"],
    [".svc-row p", 0, "Tu sitio web es tu primera impresión. Construimos el tuyo para cautivar a la gente a mitad del scroll: impactante, fluido y hecho para durar."],
    [".svc-row p", 1, "Definimos con claridad quién eres y hacia dónde vas, y luego creamos una marca que hace imposible no notarlo."],
    [".svc-row p", 2, "Las grandes marcas no solo comunican: cautivan. Damos vida a tu identidad con visuales y movimiento que dejan huella."],

    [".portfolio-head h2", null, '<span class="fit-line">Hecho con intención.</span> <span class="fit-line"><em class="rui">Diseñado para durar.</em></span>'],

    [".t-head h2", null, '<span class="fit-line">Palabras de los <em class="rui">fundadores</em></span> <span class="fit-line">con quienes hemos construido.</span>'],
    [".t-quote", 0, '"Estamos muy satisfechas con el resultado y sin duda recomendamos a Lucid a cualquier empresa o emprendedor que busque un proveedor confiable, talentoso y comprometido con entregar un trabajo de excelente calidad. <em>Lograron combinar eficiencia, creatividad y calidez humana de una manera excepcional.</em>"'],
    [".t-quote", 1, '"Lucid ha tomado nuestra visión de un sitio web simple y eficaz y <em>elevado su profesionalismo al máximo nivel,</em> garantizando a nuestros colaboradores la mejor experiencia."'],
    [".t-quote", 2, '"Lucid renovó el diseño apagado de mi novela con sus <em>cautivadoras ilustraciones originales y dirección creativa,</em> transformando mi libro con gráficos dignos de un best-seller."'],
    [".t-quote", 3, '"El trabajo de Lucid diseñando la identidad para nuestro evento de doscientas personas fue <em>simplemente increíble.</em> Fueron comunicativos, creativos y eficientes. Sin duda los contrataré de nuevo."'],

    [".contact-head", null, '<span class="fit-line">¿Tienes una <span class="rui-accent">visión?</span> <span class="cohere">Démosle <span class="focus-word">enfoque.</span></span></span>'],
    [".contact-sub", null, "Cuéntanos sobre tu proyecto y nosotros nos encargamos del resto. Sin bots. Sin formularios que no llevan a ningún lado. Te responderemos en un máximo de dos días hábiles para agendar una consulta gratis."],

    ["#contactForm label", 0, "Nombre completo"],
    ["#contactForm label", 1, "Correo electrónico"],
    ["#contactForm label", 2, "Organización"],
    ["#contactForm label", 3, 'Teléfono <span class="opt">(opcional)</span>'],
    ["#contactForm label", 4, 'Presupuesto estimado <span class="opt">(opcional)</span>'],
    ["#contactForm label", 5, "Describe tu proyecto"],
    ['#contactForm button[type="submit"]', null, 'Envíalo. <span class="arrow">↗</span>']
  ];

  var WORKS = [
    [".works-lead", null, "Cada proyecto de Lucid comienza con un pequeño negocio y una gran idea. Explora las marcas que hemos diseñado, construido y traído al foco."]
  ];

  /* "Apply same Spanish to every match" entries: [selector, spanishHTML] */
  var ALL_HTML = [
    [".case-visit", 'Visitar sitio <span class="arrow">↗</span>'],
    [".see-all-cta", 'Ver todo el trabajo <span class="arrow">↗</span>']
  ];

  /* Placeholder attributes: [selector, spanishText] */
  var PLACEHOLDERS = [
    ['#contactForm [name="full_name"]', "Tu nombre"],
    ['#contactForm [name="email"]', "tu@estudio.com"],
    ['#contactForm [name="organization"]', "Nombre de empresa o proyecto"],
    ['#contactForm [name="budget"]', "ej. $1k–2k"],
    ['#contactForm [name="message"]', "¿Qué estás construyendo y cómo se ve el éxito?"]
  ];

  /* ---------- Apply helpers ---------- */
  function setHTML(node, lang, es) {
    if (!node) return;
    if (node.__enHTML === undefined) {
      node.__enHTML = node.innerHTML;
      // The DOM already holds the English markup on first load. Rewriting
      // innerHTML here would be a visual no-op but it DETACHES the existing child
      // nodes — and other scripts (e.g. the About build-in animation) hold live
      // references to those children. So on the initial English pass we only
      // capture the original markup and leave the live nodes in place.
      if (lang !== "es") return;
    }
    node.innerHTML = lang === "es" ? es : node.__enHTML;
  }

  function runEntries(list, lang) {
    list.forEach(function (e) {
      var q = e[0], idx = e[1], es = e[2];
      var nodes = document.querySelectorAll(q);
      var node = idx == null ? nodes[0] : nodes[idx];
      setHTML(node, lang, es);
    });
  }

  function runAllHTML(list, lang) {
    list.forEach(function (e) {
      document.querySelectorAll(e[0]).forEach(function (node) {
        setHTML(node, lang, e[1]);
      });
    });
  }

  function runText(lang) {
    document.querySelectorAll(TEXT_SCOPE).forEach(function (el) {
      el.childNodes.forEach(function (n) {
        if (n.nodeType !== 3) return;          // text nodes only
        if (n.__orig === undefined) {
          if (!n.nodeValue.trim()) return;
          n.__orig = n.nodeValue;
        }
        var key = n.__orig.trim();
        if (lang === "es" && TEXT[key] != null) {
          n.nodeValue = n.__orig.replace(key, TEXT[key]);
        } else {
          n.nodeValue = n.__orig;
        }
      });
    });
  }

  function runPlaceholders(lang) {
    PLACEHOLDERS.forEach(function (e) {
      var node = document.querySelector(e[0]);
      if (!node) return;
      if (node.__enPH === undefined) node.__enPH = node.getAttribute("placeholder") || "";
      node.setAttribute("placeholder", lang === "es" ? e[1] : node.__enPH);
    });
  }

  var isWorks = document.body.classList.contains("works-page");

  function translate(lang) {
    runText(lang);
    runEntries(COMMON, lang);
    runEntries(isWorks ? WORKS : INDEX, lang);
    runAllHTML(ALL_HTML, lang);
    runPlaceholders(lang);
  }

  /* ---------- Toggle wiring + persistence ---------- */
  var KEY = "lucid-lang";
  var current = "en";
  try { if (localStorage.getItem(KEY) === "es") current = "es"; } catch (e) {}

  function setLang(lang, save) {
    current = lang === "es" ? "es" : "en";
    document.body.setAttribute("data-lang", current);
    document.documentElement.setAttribute("lang", current);
    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.setAttribute("aria-checked", current === "es" ? "true" : "false");
      toggle.setAttribute("aria-label",
        current === "es" ? "Cambiar idioma a inglés" : "Switch language to Spanish");
    }
    translate(current);
    if (save) { try { localStorage.setItem(KEY, current); } catch (e) {} }
  }

  function init() {
    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        setLang(current === "es" ? "en" : "es", true);
      });
    }
    setLang(current, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
