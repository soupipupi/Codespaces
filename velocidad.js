(() => {
  "use strict";

  // nombre, km/h, medio, clase, emoji
  const DATA = [
    ["Halcón peregrino",389,"aire","ave","🦅"],
    ["Águila real",320,"aire","ave","🦅"],
    ["Vencejo real",169,"aire","ave","🐦"],
    ["Murciélago",160,"aire","mamífero","🦇"],
    ["Fragata",153,"aire","ave","🐦"],
    ["Paloma mensajera",148,"aire","ave","🕊️"],
    ["Pez vela",110,"agua","pez","🐟"],
    ["Pez espada",97,"agua","pez","🐠"],
    ["Guepardo",120,"tierra","mamífero","🐆"],
    ["Berrendo",88,"tierra","mamífero","🦌"],
    ["Caballo de carrera",88,"tierra","mamífero","🐎"],
    ["León",80,"tierra","mamífero","🦁"],
    ["Ñu",80,"tierra","mamífero","🐃"],
    ["Tiburón mako",74,"agua","pez","🦈"],
    ["Galgo",74,"tierra","mamífero","🐕"],
    ["Canguro rojo",71,"tierra","mamífero","🦘"],
    ["Avestruz",70,"tierra","ave","🐦"],
    ["Liebre",70,"tierra","mamífero","🐇"],
    ["Cebra",64,"tierra","mamífero","🦓"],
    ["Delfín",60,"agua","mamífero","🐬"],
    ["Jirafa",60,"tierra","mamífero","🦒"],
    ["Orca",56,"agua","mamífero","🐋"],
    ["Conejo",56,"tierra","mamífero","🐰"],
    ["Oso pardo",56,"tierra","mamífero","🐻"],
    ["Gato doméstico",48,"tierra","mamífero","🐈"],
    ["Usain Bolt",44.7,"tierra","humano","🏃"],
    ["Elefante",40,"tierra","mamífero","🐘"],
    ["Pingüino papúa",36,"agua","ave","🐧"],
    ["Tortuga marina",35,"agua","reptil","🐢"],
    ["Abeja",29,"aire","insecto","🐝"],
    ["Ardilla",20,"tierra","mamífero","🐿️"],
    ["Mariposa monarca",20,"aire","insecto","🦋"],
    ["Cocodrilo",17,"tierra","reptil","🐊"],
    ["Gallina",14,"tierra","ave","🐔"],
    ["Ratón",13,"tierra","mamífero","🐁"],
    ["Humano trotando",12,"tierra","humano","🚶"],
    ["Mosca doméstica",8,"aire","insecto","🪰"],
    ["Araña",1.9,"tierra","arácnido","🕷️"],
    ["Hormiga",0.3,"tierra","insecto","🐜"],
    ["Tortuga terrestre",0.3,"tierra","reptil","🐢"],
    ["Perezoso",0.27,"tierra","mamífero","🦥"],
    ["Estrella de mar",0.09,"agua","equinodermo","⭐"],
    ["Caracol",0.048,"tierra","molusco","🐌"]
  ].map(([nombre,kmh,medio,clase,emoji]) => ({nombre,kmh,medio,clase,emoji}))
   .sort((a,b) => b.kmh - a.kmh);

  const V_MIN = 0.048, V_MAX = 389;
  const COLOR = {tierra:"#c4821f", aire:"#9b7bf0", agua:"#1f97a6", tu:"#e85d75"};

  // pasos por segundo estimados
  const stride = v => 0.5 * Math.pow(v, 0.4);
  // tono: cuatro octavas desde 80 Hz, logarítmico en velocidad
  const pitch = v => 80 * Math.pow(2, 4 * (Math.log10(Math.max(v,0.001)) - Math.log10(V_MIN)) / (Math.log10(V_MAX) - Math.log10(V_MIN)));

  const nf = (n, d) => n.toLocaleString("es-CL", {minimumFractionDigits:d, maximumFractionDigits:d});
  const fmtSpeed = v => Number.isInteger(v) ? nf(v,0) : v >= 1 ? nf(v,1) : nf(v,3);

  function fmtTime(s){
    if (s < 60) return nf(s, s < 10 ? 1 : 0) + " s";
    if (s < 3600) return Math.floor(s/60) + " min " + nf(s%60,0) + " s";
    if (s < 86400) return Math.floor(s/3600) + " h " + nf((s%3600)/60,0) + " min";
    if (s < 86400*365) return nf(s/86400,1) + " días";
    return nf(s/(86400*365),1) + " años";
  }

  /* ---------------- audio ---------------- */
  let ac = null, soundOn = true;
  function actx(){
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; } }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function blip(freq, at, dur, vol){
    const c = actx(); if (!c || !soundOn) return;
    const t = at ?? c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol ?? 0.13, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur ?? 0.07));
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + (dur ?? 0.07) + 0.02);
  }
  let previewStop = null;
  function preview(v, medio="tierra"){
    const c = actx(); if (!c || !soundOn) return;
    if (previewStop) previewStop();
    const f = pitch(v), now = c.currentTime, LEN = 1.5;
    // drone: la altura ya lleva el dato aunque no alcance ni un paso
    const o = c.createOscillator(), g = c.createGain();
    o.type = ({tierra:"triangle",aire:"sine",agua:"sawtooth"})[medio] || "triangle"; o.frequency.setValueAtTime(f/2, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + LEN);
    o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + LEN + 0.05);
    // golpes a la cadencia real
    const sps = stride(v), gap = 1 / sps, n = Math.min(Math.floor(LEN / gap) + 1, 24);
    for (let i = 0; i < n; i++) blip(f, now + i * gap, 0.06, 0.1);
    previewStop = () => { try { o.stop(); } catch(e){} previewStop = null; };
  }

  /* ---------------- ranking ---------------- */
  const barsEl = document.getElementById("bars");
  const gridEl = document.getElementById("grid");
  const axisEl = document.getElementById("axis");
  const emptyEl = document.getElementById("empty");
  const calloutEl = document.getElementById("callout");
  const tbody = document.getElementById("tbody");

  let scaleMode = "lin";
  const medios = new Set(["tierra","aire","agua"]);
  let selectedRanking = null;
  let chartParticipants = [];
  let me = null;              // {nombre, kmh, ...} del jugador

  const pos = v => scaleMode === "lin"
    ? v / V_MAX
    : (Math.log10(Math.max(v, V_MIN)) - Math.log10(V_MIN)) / (Math.log10(V_MAX) - Math.log10(V_MIN));

  function visible(){
    const list = DATA.filter(d => medios.has(d.medio));
    return me ? [...list, me].sort((a,b) => b.kmh - a.kmh) : list;
  }

  function drawAxis(){
    const ticks = scaleMode === "lin" ? [0,100,200,300,389] : [0.048,0.1,1,10,100,389];
    axisEl.innerHTML = "";
    gridEl.innerHTML = "";
    axisEl.style.marginLeft = getComputedStyle(barsEl).getPropertyValue("--namecol");
    axisEl.style.marginRight = "56px";
    axisEl.style.position = "relative";
    ticks.forEach(t => {
      const p = (t === 0 ? 0 : pos(t)) * 100;
      const s = document.createElement("span");
      s.className = "tick"; s.style.left = p + "%";
      s.textContent = t === 0 ? "0" : fmtSpeed(t);
      axisEl.appendChild(s);
      const g = document.createElement("div");
      g.className = "gline"; g.style.left = p + "%";
      gridEl.appendChild(g);
    });
  }

  function render(){
    const list = visible();
    emptyEl.hidden = list.length > 0;
    [...barsEl.querySelectorAll(".row")].forEach(r => r.remove());
    list.forEach(d => {
      const row = document.createElement("button");
      row.className = "row" + (chartParticipants.includes(d) ? " on" : "");
      row.type = "button";
      row.setAttribute("aria-label", `${d.nombre}, ${fmtSpeed(d.kmh)} kilómetros por hora`);
      const c = d.tu ? COLOR.tu : COLOR[d.medio];
      row.innerHTML =
        `<span class="nm"><span class="em">${d.emoji}</span>${d.nombre}</span>` +
        `<span class="plot"><span class="fill" style="background:${c};width:${(pos(d.kmh)*100).toFixed(3)}%"></span></span>` +
        `<span class="vl">${fmtSpeed(d.kmh)}</span>`;
      row.addEventListener("mouseenter", () => preview(d.kmh, d.medio));
      row.addEventListener("focus", () => preview(d.kmh, d.medio));
      row.setAttribute("aria-pressed", String(chartParticipants.includes(d)));
      row.addEventListener("click", () => { toggleIntroParticipant(d); preview(d.kmh, d.medio); });
      barsEl.appendChild(row);
    });
    drawAxis();
    calloutEl.innerHTML = scaleMode === "lin"
      ? "<b>Escala lineal.</b> El halcón se come todo el ancho y los últimos veinte animales son una raya de un píxel. No es un problema de diseño gráfico: es que 389 y 0,048 no caben en la misma regla. Cambia a logarítmica y mira lo que pasa."
      : "<b>Escala logarítmica.</b> Cada marca del eje multiplica por diez en vez de sumar, así que ahora se ven todos. El precio: las longitudes no representan proporciones lineales. Por eso puedes alternar las dos escalas.";
    if (selectedRanking) calloutEl.innerHTML += ` <b>${selectedRanking.emoji} ${selectedRanking.nombre}:</b> ${fmtSpeed(selectedRanking.kmh)} km/h ${selectedRanking.tu ? "(resultado de tu prueba)" : "de velocidad máxima aproximada"}.`;
    calloutEl.innerHTML += ` <b>En La pista:</b> ${chartParticipants.length} de 6 seleccionados.`;
  }

  function fillTable(){
    tbody.innerHTML = DATA.map(d =>
      `<tr><td>${d.emoji} ${d.nombre}</td><td>${d.medio}</td><td>${d.clase}</td>` +
      `<td class="n">${fmtSpeed(d.kmh)}</td><td class="n">${nf(d.kmh/3.6, 2)}</td>` +
      `<td class="n">${nf(stride(d.kmh), 2)}</td></tr>`).join("");
  }

  document.getElementById("filters").addEventListener("click", e => {
    const chip = e.target.closest(".chip[data-medio]");
    if (!chip) return;
    const m = chip.dataset.medio, on = chip.getAttribute("aria-pressed") === "true";
    if (on && medios.size === 1) return;
    on ? medios.delete(m) : medios.add(m);
    chip.setAttribute("aria-pressed", String(!on));
    render();
  });

  document.getElementById("scale").addEventListener("click", e => {
    const b = e.target.closest("button[data-scale]"); if (!b) return;
    scaleMode = b.dataset.scale;
    [...e.currentTarget.children].forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });

  /* ---------------- tu turno: sensores ---------------- */
  const tapBtn   = document.getElementById("tap");
  const tapCount = document.getElementById("tapCount");
  const tapTime  = document.getElementById("tapTime");
  const mySpeedEl= document.getElementById("myspeed");
  const beatMsg  = document.getElementById("beatmsg");
  const beatList = document.getElementById("beatlist");
  const statusEl = document.getElementById("status");
  const strideWrap = document.getElementById("strideWrap");
  const strideIn = document.getElementById("stride");
  const strideVal= document.getElementById("strideVal");
  const lkA=document.getElementById("lkA"), lvA=document.getElementById("lvA"), luA=document.getElementById("luA");
  const lkB=document.getElementById("lkB"), lvB=document.getElementById("lvB"), luB=document.getElementById("luB");

  const COPY = {
    motion: "Correr en el lugar no te mueve del suelo, así que el sensor solo puede darte la <em>cadencia</em>. La velocidad sale de multiplicarla por la zancada que elijas aquí abajo: es una estimación, igual que la de cualquier reloj deportivo.",
    gps:    "El GPS entrega la velocidad medida por el aparato, sin suposiciones. Necesita cielo abierto y unos segundos para fijar la señal; adentro de una casa no sirve. Nos quedamos con tu máxima.",
    tap:    "Esto mide la frecuencia de tu dedo, no la de tus piernas. Sirve para probar la página desde el computador, pero no es una medición de nada."
  };
  const DUR = {motion: 10, tap: 10, gps: 0};   // 0 = hasta que pares

  let mode = "motion";
  let running = false, tStart = 0, tick = null;
  let steps = 0, lastStep = 0, gravEMA = null, above = false, gotMotion = false, motionWatch = null;
  let gpsId = null, gpsMax = 0, gpsNow = 0, lastFix = null;
  let lastPerm = "no probado", motionEvents = 0, lastGpsErr = "no probado";
  let strideM = 1.8;
  let taps = 0;

  const say = (html, warn) => { statusEl.innerHTML = html; statusEl.classList.toggle("warn", !!warn); };

  /* --- acelerómetro: detección de pasos por picos --- */
  function onMotion(e){
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x === null || a.x === undefined) return;
    gotMotion = true; motionEvents++;
    const mag = Math.hypot(a.x, a.y, a.z);
    gravEMA = gravEMA === null ? mag : gravEMA * 0.88 + mag * 0.12;   // pasa-altos: saca la gravedad
    const dyn = mag - gravEMA;
    const now = performance.now();
    const TH = 2.2;                                                   // m/s² sobre el reposo
    if (!above && dyn > TH && now - lastStep > 180){                  // 180 ms = tope de 5,5 pasos/s
      above = true; steps++; lastStep = now;
      blip(330 + Math.random()*40, null, 0.045, 0.09);
    } else if (above && dyn < TH * 0.45){ above = false; }
  }

  async function askMotion(){
    if (typeof DeviceMotionEvent === "undefined") return "nosensor";
    if (typeof DeviceMotionEvent.requestPermission === "function"){
      try { return (await DeviceMotionEvent.requestPermission()) === "granted" ? "ok" : "denied"; }
      catch(err){ return "blocked"; }
    }
    return "ok";
  }

  /* --- GPS --- */
  const R = 6371000;
  function haversine(a, b){
    const dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
    const la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180;
    const h=Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  }
  function startGps(){
    if (!navigator.geolocation){ say("Este navegador no entrega GPS. Prueba con movimiento o teclado.", true); return false; }
    say("Buscando señal… sal a un lugar despejado y empieza a moverte.");
    gpsMax = 0; gpsNow = 0; lastFix = null;
    gpsId = navigator.geolocation.watchPosition(pos => {
      const c = pos.coords;
      let v = (typeof c.speed === "number" && !isNaN(c.speed)) ? c.speed : null;  // m/s
      const fix = {lat:c.latitude, lon:c.longitude, t:pos.timestamp};
      if (v === null && lastFix){
        const dt = (fix.t - lastFix.t) / 1000;
        if (dt > 0.3) v = haversine(lastFix, fix) / dt;
      }
      lastFix = fix;
      if (v !== null && isFinite(v) && v >= 0){
        gpsNow = v * 3.6;
        if (gpsNow > gpsMax) gpsMax = gpsNow;
        say(`Señal fija, precisión ±${nf(c.accuracy || 0, 0)} m. Aprieta “Listo” cuando termines.`);
      }
    }, err => {
      lastGpsErr = {1:"permiso denegado",2:"sin señal",3:"tiempo agotado"}[err.code] || ("código " + err.code);
      const m = {1:"<b>El visor bloquea la ubicación.</b> El marco donde corre esta página no tiene permiso de GPS, así que el navegador rechaza la petición sin preguntarte. Sube <code>index.html</code> a GitHub Pages y ahí funciona.",
                 2:"No hay señal de GPS. Tiene que ser al aire libre.",
                 3:"El GPS tardó demasiado. Intenta de nuevo al aire libre."};
      say((m[err.code] || "El GPS falló.") + " Mientras tanto: modo teclado.", true);
      stop(true);
    }, {enableHighAccuracy:true, maximumAge:0, timeout:12000});
    return true;
  }

  /* --- ciclo de medición --- */
  function setMode(m){
    if (running) stop(true);
    mode = m;
    [...document.getElementById("modes").children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    strideWrap.hidden = (m === "gps");
    lkA.textContent = m === "gps" ? "Máxima" : "Cadencia";
    luA.textContent = m === "gps" ? "km/h" : (m === "tap" ? "toques/s" : "pasos/s");
    lkB.textContent = m === "gps" ? "Ahora" : "Equivale a";
    tapBtn.textContent = "Medir";
    tapCount.textContent = m === "gps" ? "0,0 km/h máx." : "— pasos";
    tapTime.textContent = DUR[m] ? nf(DUR[m],1) + " s" : "libre";
    lvA.textContent = "0,0"; lvB.textContent = "0,0";
    say(COPY[m]);
  }

  async function start(){
    actx();
    steps = 0; taps = 0; gravEMA = null; above = false; gotMotion = false; lastStep = 0;
    if (mode === "motion"){
      const r = await askMotion(); lastPerm = r; motionEvents = 0;
      if (r === "nosensor"){ say("Este aparato no tiene acelerómetro (o es un computador de escritorio). Usa el modo teclado.", true); return; }
      if (r === "denied" || r === "blocked"){ say("<b>El visor bloquea el sensor.</b> Esta página corre dentro de un marco que no tiene permiso de acelerómetro, así que el celular ni siquiera alcanza a preguntarte. No es tu teléfono. Sube el archivo <code>index.html</code> a GitHub Pages y ahí funciona. Mientras tanto: modo teclado.", true); return; }
      window.addEventListener("devicemotion", onMotion);
      motionWatch = setTimeout(() => {
        if (!gotMotion){ say("<b>El visor bloquea el sensor.</b> El permiso pasó pero no llega ni un dato: el marco donde vive esta página filtra el acelerómetro. En tu propio sitio (GitHub Pages) funciona. Mientras tanto: modo teclado.", true); stop(true); }
      }, 2000);
      say("Midiendo. Corre en el lugar levantando bien las rodillas, con el celular firme en la mano.");
    } else if (mode === "gps"){
      if (!startGps()) return;
      tapBtn.textContent = "Listo";
    } else {
      say("Midiendo. Aprieta espacio o el botón lo más rápido que puedas.");
    }
    running = true; tStart = performance.now();
    tapBtn.classList.add("live");
    if (mode !== "gps") tapBtn.textContent = "¡Dale!";
    tick = setInterval(update, 60);
  }

  function update(){
    const el = (performance.now() - tStart) / 1000;
    if (mode === "gps"){
      lvA.textContent = nf(gpsMax, 1); lvB.textContent = nf(gpsNow, 1);
      tapCount.textContent = nf(gpsMax,1) + " km/h máx.";
      tapTime.textContent = fmtTime(el);
      return;
    }
    const n = mode === "tap" ? taps : steps;
    const rate = el > 0.3 ? n / el : 0;
    lvA.textContent = nf(rate, 1);
    lvB.textContent = nf(rate * strideM * 3.6, 1);
    tapCount.textContent = n + (mode === "tap" ? " toques" : " pasos");
    tapTime.textContent = nf(Math.max(DUR[mode] - el, 0), 1) + " s";
    if (el >= DUR[mode]) stop(false);
  }

  function stop(abort){
    if (!running && !abort) return;
    running = false;
    clearInterval(tick); tick = null;
    clearTimeout(motionWatch);
    window.removeEventListener("devicemotion", onMotion);
    if (gpsId !== null){ navigator.geolocation.clearWatch(gpsId); gpsId = null; }
    tapBtn.classList.remove("live");
    tapBtn.textContent = abort ? "Medir" : "Otra vez";
    if (abort) return;

    const el = (performance.now() - tStart) / 1000;
    let kmh, detalle;
    if (mode === "gps"){
      kmh = Math.round(gpsMax * 10) / 10;
      detalle = `Tu máxima medida por GPS en ${fmtTime(el)}.`;
    } else {
      const n = mode === "tap" ? taps : steps;
      const rate = n / Math.max(el, 0.1);
      kmh = Math.round(rate * strideM * 3.6 * 10) / 10;
      detalle = `${n} ${mode === "tap" ? "toques" : "pasos"} en ${nf(el,1)} s (${nf(rate,1)}/s) × ${nf(strideM,2)} m de zancada.`;
    }
    verdict(kmh, detalle);
    say(COPY[mode]);
  }

  function verdict(kmh, detalle){
    const simulated = mode !== "gps";
    mySpeedEl.textContent = fmtSpeed(kmh) + " km/h";
    const beaten = DATA.filter(d => d.kmh < kmh);
    const next = [...DATA].reverse().find(d => d.kmh > kmh);
    const qualifier = mode === "gps" ? "Velocidad estimada por GPS." : mode === "motion" ? "Equivalencia estimada a partir del movimiento." : "Equivalencia simulada desde el teclado; no es tu velocidad al correr.";
    beatMsg.innerHTML = `${detalle} <b>${beaten.length} de ${DATA.length}</b> competidores quedarían por debajo de tu resultado. ${qualifier}`;
    const rival = document.getElementById("result-rival");
    rival.hidden = false;
    if (next) {
      const difference = next.kmh - kmh;
      rival.innerHTML = `<strong>${next.emoji} Tu próximo rival: ${next.nombre}</strong><br>Alcanza ${fmtSpeed(next.kmh)} km/h. Te faltan <strong>${nf(difference,difference<0.1?2:1)} km/h</strong> para igualarlo.`;
    } else if (kmh <= 0) {
      rival.innerHTML = `<strong>🐌 Tu siguiente desafío:</strong> intenta registrar una velocidad para empezar a competir.`;
    } else {
      rival.innerHTML = `<strong>🏆 Tu resultado supera a todos los competidores de este ranking.</strong> Revisa la calibración de la prueba si la cifra te parece inusual.`;
    }
    beatList.innerHTML = beaten.slice(-4).reverse().map(d => `<li>${d.nombre} ${d.emoji} · ${fmtSpeed(d.kmh)} km/h</li>`).join("");

    if (!me) me = {nombre:"Tú", kmh, medio:"tierra", clase:"humano", emoji:"🏃‍♂️", tu:true};
    else me.kmh = kmh;
    me.tipo = simulated ? "simulada" : "gps";
    selectedRanking = me;
    if (chartParticipants.includes(me)) rebuildIntro();
    render();
  }

  /* --- diagnóstico --- */
  document.getElementById("diagRun").addEventListener("click", async () => {
    const list = document.getElementById("diagList"), fixEl = document.getElementById("diagFix");
    const enMarco = window.self !== window.top;
    const proto = location.protocol;
    const httpsOk = proto === "https:" || location.hostname === "localhost";
    const hayDM = typeof DeviceMotionEvent !== "undefined";
    const pideiOS = hayDM && typeof DeviceMotionEvent.requestPermission === "function";
    const hayGPS = "geolocation" in navigator;
    let permGPS = "desconocido";
    try { if (navigator.permissions) permGPS = (await navigator.permissions.query({name:"geolocation"})).state; } catch(e){}

    const rows = [
      [httpsOk, "Conexión segura (HTTPS)", proto + "//" + (location.hostname || "archivo local")],
      [!enMarco, enMarco ? "Estás dentro de un marco (iframe)" : "Página dueña de la ventana", enMarco ? "los sensores no cruzan el marco" : "correcto"],
      [hayDM, hayDM ? "El aparato reporta acelerómetro" : "Sin acelerómetro", pideiOS ? "pide permiso al estilo iPhone" : (hayDM ? "no necesita permiso explícito" : "típico de computador de escritorio")],
      [lastPerm === "ok", "Permiso de movimiento", lastPerm],
      [motionEvents > 0, "Datos recibidos del sensor", motionEvents + " lecturas en el último intento"],
      [hayGPS, "El navegador ofrece GPS", "permiso: " + permGPS + " · último error: " + lastGpsErr]
    ];
    list.innerHTML = rows.map(([ok, k, v]) =>
      `<li><span>${ok ? "✅" : "❌"}</span><span><span class="k">${k}</span><span class="v">${v}</span></span></li>`).join("");

    let fix;
    if (!httpsOk && proto === "file:")
      fix = "Abriste el archivo con doble clic. Los sensores <b>nunca</b> funcionan así. Súbelo a GitHub Pages y entra por el link <code>https://…github.io/…</code>";
    else if (enMarco)
      fix = "La página está metida dentro de otra. Ábrela en su propia pestaña, con su URL directa en la barra de direcciones.";
    else if (!hayDM)
      fix = "Este aparato no tiene acelerómetro: casi seguro es un computador. Entra desde el celular.";
    else if (lastPerm === "denied" && pideiOS)
      fix = "iPhone: el permiso salió <b>denied</b> sin preguntarte. Anda a <b>Ajustes → Apps → Safari → Avanzado → Acceso a movimiento y orientación</b> y actívalo. Después recarga. Si usas Chrome o abriste el link desde Instagram/WhatsApp, prueba en Safari directamente.";
    else if (lastPerm === "blocked")
      fix = "La petición de permiso lanzó un error. Pasa casi siempre por no estar en HTTPS o por estar dentro de un marco.";
    else if (lastPerm === "ok" && motionEvents === 0)
      fix = "El permiso se dio pero no llega ni una lectura. Suele ser un navegador dentro de otra app (Instagram, WhatsApp, Gmail). Abre el link en Safari o Chrome de verdad.";
    else if (lastPerm === "no probado")
      fix = "Todavía no aprietas «Medir» en modo movimiento. Hazlo y vuelve a revisar: recién ahí se sabe qué contesta el permiso.";
    else
      fix = "Todo se ve en orden. Si igual no marca pasos, agita más fuerte: el umbral está en 2,2 m/s² sobre el reposo.";
    fixEl.innerHTML = fix; fixEl.hidden = false;
  });

  document.getElementById("modes").addEventListener("click", e => {
    const b = e.target.closest(".mode"); if (b){ setMode(b.dataset.mode); b.blur(); }
  });
  strideIn.addEventListener("input", e => {
    strideM = +e.target.value; strideVal.textContent = nf(strideM, 2);
  });
  tapBtn.addEventListener("click", () => {
    if (mode === "tap"){ if (!running) start(); return; }   // los toques los cuenta pointerdown
    running ? stop(false) : start();
  });
  tapBtn.addEventListener("pointerdown", e => { if (running && mode === "tap"){ e.preventDefault(); taps++; blip(320 + Math.random()*60, null, 0.04, 0.09); } });
  document.addEventListener("keydown", e => {
    if (e.code !== "Space" || mode !== "tap") return;
    const a = document.activeElement;
    if (a && /^(input|select|textarea)$/i.test(a.tagName)) return;
    e.preventDefault();
    if (!running) start(); else { taps++; blip(320 + Math.random()*60, null, 0.04, 0.09); }
  });
  setMode("motion");

  fillTable(); render();
  window.addEventListener("resize", () => drawAxis());


  const initialNames = [
    "Halcón peregrino", "Guepardo", "Pez vela",
    "Galgo", "Gato doméstico", "Caracol"
  ];
  const chartColors = ["#9b7bf0", "#c4821f", "#1f97a6", "#e85d75", "#7fc4ad", "#c8ccd6"];
  const introSvg = document.getElementById("intro-svg");
  const introTime = document.getElementById("intro-time");
  const introLegend = document.getElementById("intro-legend");
  const introStatus = document.getElementById("intro-status");
  const introSelectionInfo = document.getElementById("intro-selected");
  const introWinner = document.getElementById("intro-winner");
  const introReplay = document.getElementById("intro-replay");
  const NS = "http://www.w3.org/2000/svg";
  const graph = {left:64,right:801,top:30,bottom:346,duration:8,maxDistance:900};
  const timeX = t => graph.left + (t / graph.duration) * (graph.right-graph.left);
  const distanceY = d => graph.bottom - (d / graph.maxDistance) * (graph.bottom-graph.top);
  let introAudio = false;
  let introRAF = null;
  let introStarted = 0;
  let introElapsed = 0;
  let introNextTone = 0;
  let introLines = [];
  let cursor = null;
  let introRunning = false;

  function svgNode(tag,attrs={},parent=introSvg){
    const element = document.createElementNS(NS,tag);
    for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
    parent.appendChild(element);
    return element;
  }

  function svgLabel(x,y,label,attrs={}){
    const element = svgNode("text",{x,y,fill:"#a3a8b5","font-family":"Space Mono, monospace","font-size":11,...attrs});
    element.textContent=label;
    return element;
  }

  function niceStep(value){
    const exponent=Math.floor(Math.log10(Math.max(value,0.000001)));
    const power=10**exponent;
    const fraction=value/power;
    const nice=fraction<=1 ? 1 : fraction<=2 ? 2 : fraction<=2.5 ? 2.5 : fraction<=5 ? 5 : 10;
    return nice*power;
  }

  function metresLabel(value){
    if(value===0) return "0";
    if(value>=10) return nf(value,value%1===0?0:1);
    if(value>=1) return nf(value,value%1===0?0:2);
    if(value>=0.1) return nf(value,2);
    if(value>=0.01) return nf(value,3);
    return nf(value,4);
  }

  function chartColor(animal,index){
    if(animal.tu) return COLOR.tu;
    const withoutPlayer=chartColors.filter(c=>c!==COLOR.tu);
    return chartParticipants.some(d=>d.tu) ? withoutPlayer[index%withoutPlayer.length] : chartColors[index%chartColors.length];
  }

  function updateIntroFocus(){
    if(!chartParticipants.includes(selectedRanking)) selectedRanking=chartParticipants[0];
    introLines.forEach(({animal,group,line,chip})=>{
      const active=animal===selectedRanking;
      chip.dataset.active=String(active);
      chip.setAttribute("aria-pressed",String(active));
      group.setAttribute("opacity",active?1:.6);
      line.setAttribute("stroke-width",active?4.2:2.6);
    });
    const focused=introLines.find(d=>d.animal===selectedRanking);
    if(focused) introSvg.appendChild(focused.group);
    const animal=selectedRanking;
    if(animal){
      const distance=animal.kmh/3.6*8;
      const note=animal.tu
        ? (animal.tipo==="gps" ? "Tu resultado estimado por GPS" : "Tu equivalencia simulada")
        : "Velocidad máxima aproximada";
      introSelectionInfo.innerHTML=`${animal.emoji} <strong>${animal.nombre}</strong> · <span class="mono">${fmtSpeed(animal.kmh)} km/h</span> · <span class="mono">${metresLabel(distance)} m en 8 s</span> · ${note}`;
    }
  }

  function setIntroTime(t){
    introElapsed=t;
    introTime.textContent=nf(t,1)+" s";
    if(cursor){
      cursor.setAttribute("x1",timeX(t));
      cursor.setAttribute("x2",timeX(t));
    }
    introLines.forEach(({animal,line,dot,marker})=>{
      const x=timeX(t), y=distanceY(animal.kmh/3.6*t);
      line.setAttribute("d",`M ${graph.left} ${graph.bottom} L ${x} ${y}`);
      dot.setAttribute("cx",x);
      dot.setAttribute("cy",y);
      dot.setAttribute("opacity",t>0.01?1:0);
      marker.setAttribute("opacity",t>0.01?1:0);
      marker.setAttribute("x",x+13);
      marker.setAttribute("y",Math.max(y-12,18));
    });
  }

  function rebuildIntro(){
    if(introRAF!==null) cancelAnimationFrame(introRAF);
    introRAF=null;
    introRunning=false;
    introWinner.hidden=true;
    introReplay.textContent="▶ Iniciar simulación";
    introLegend.replaceChildren();
    introSvg.replaceChildren();
    introLines=[];
    const topDistance=Math.max(...chartParticipants.map(d=>d.kmh*graph.duration/3.6),0.01)*1.08;
    const step=niceStep(topDistance/5);
    graph.maxDistance=Math.max(step,Math.ceil(topDistance/step)*step);

    const divisions=Math.round(graph.maxDistance/step);
    for(let i=0;i<=divisions;i++){
      const metres=Number((i*step).toPrecision(10));
      const y=distanceY(metres);
      svgNode("line",{x1:graph.left,y1:y,x2:graph.right,y2:y,stroke:"#30353e","stroke-dasharray":"3 6"});
      svgLabel(graph.left-11,y+4,metresLabel(metres),{"text-anchor":"end"});
    }
    for(let t=0;t<=8;t+=2){
      const x=timeX(t);
      svgNode("line",{x1:x,y1:graph.top,x2:x,y2:graph.bottom,stroke:"#242931"});
      svgLabel(x,graph.bottom+29,`${t} s`,{"text-anchor":"middle"});
    }
    svgLabel(graph.left,17,"DISTANCIA (m)",{fill:"#c8ccd6"});
    svgLabel(graph.right,397,"TIEMPO (s)",{"text-anchor":"end",fill:"#c8ccd6"});
    svgLabel(graph.left+8,graph.bottom-12,"PARTIDA",{"font-size":10,fill:"#6e7482"});
    cursor=svgNode("line",{x1:graph.left,y1:graph.top,x2:graph.left,y2:graph.bottom,stroke:"#7d8492","stroke-dasharray":"3 5"});

    introLines=chartParticipants.map((animal,index)=>{
      const color=chartColor(animal,index);
      const group=svgNode("g");
      const line=svgNode("path",{fill:"none",stroke:color,"stroke-width":2.6,"stroke-linecap":"round"},group);
      const dot=svgNode("circle",{r:4,fill:color},group);
      const marker=svgNode("text",{"font-size":22,"text-anchor":"middle","dominant-baseline":"middle"},group);
      marker.textContent=animal.emoji;
      const chip=document.createElement("button");
      chip.type="button";
      chip.className="intro-chip";
      chip.style.setProperty("--intro-color",color);
      chip.innerHTML=`<span class="intro-chip-dot"></span><span>${animal.emoji} ${animal.nombre}</span><strong>${fmtSpeed(animal.kmh)} km/h</strong>`;
      chip.addEventListener("click",()=>{
        selectedRanking=animal;
        updateIntroFocus();
        render();
        if(introAudio) soundIntro(animal);
      });
      introLegend.appendChild(chip);
      return {animal,group,line,dot,marker,chip};
    });
    introStatus.textContent=`${chartParticipants.length} de 6 competidores · edita desde el ranking`;
    setIntroTime(0);
    updateIntroFocus();
  }

  function toggleIntroParticipant(animal){
    const index=chartParticipants.indexOf(animal);
    if(index>=0){
      if(chartParticipants.length===1){
        introStatus.textContent="La pista necesita al menos un participante";
        selectedRanking=animal;
        updateIntroFocus();
        return;
      }
      chartParticipants.splice(index,1);
      selectedRanking=chartParticipants[0];
    }else{
      if(chartParticipants.length===6) chartParticipants.shift();
      chartParticipants.push(animal);
      selectedRanking=animal;
    }
    rebuildIntro();
    render();
  }

  function soundIntro(animal){
    if(!introAudio) return;
    const context=actx();
    if(!context) return;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=({tierra:"triangle",aire:"sine",agua:"sawtooth"})[animal.medio]||"triangle";
    oscillator.frequency.setValueAtTime(pitch(Math.max(animal.kmh,V_MIN)),context.currentTime);
    const now=context.currentTime;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.045,now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.12);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(now);oscillator.stop(now+.14);
  }

  function showIntroWinner(){
    const maximum=Math.max(...chartParticipants.map(d=>d.kmh));
    const winners=chartParticipants.filter(d=>d.kmh===maximum);
    const name=winners.map(d=>`${d.emoji} ${d.nombre}`).join(" y ");
    const distance=maximum*8/3.6;
    introWinner.innerHTML=`<strong>🏆 ${winners.length>1?"Empataron":"Ganó"}: ${name}</strong> · <span class="mono">${fmtSpeed(maximum)} km/h</span> · <span class="mono">${metresLabel(distance)} metros en 8 segundos</span>`;
    introWinner.hidden=false;
  }

  function introFrame(now){
    const t=Math.min((now-introStarted)/1000,graph.duration);
    setIntroTime(t);
    if(introAudio&&t>=introNextTone){
      const animal=selectedRanking;
      if(animal){
        soundIntro(animal);
        const pulses=.4+3*Math.sqrt(Math.max(animal.kmh,0)/V_MAX);
        introNextTone=t+1/pulses;
      }
    }
    if(t<graph.duration){introRAF=requestAnimationFrame(introFrame);}
    else{
      introRAF=null;
      introRunning=false;
      introReplay.textContent="↻ Repetir simulación";
      showIntroWinner();
    }
  }

  function startIntro(){
    if(introRAF!==null) cancelAnimationFrame(introRAF);
    introStarted=performance.now();
    introNextTone=0;
    introWinner.hidden=true;
    introRunning=true;
    introReplay.textContent="↻ Reiniciar simulación";
    setIntroTime(0);
    introRAF=requestAnimationFrame(introFrame);
  }

  introReplay.addEventListener("click",startIntro);
  document.getElementById("intro-reset").addEventListener("click",()=>{
    chartParticipants=initialNames.map(name=>DATA.find(d=>d.nombre===name));
    selectedRanking=chartParticipants[0];
    rebuildIntro();
    render();
  });
  document.getElementById("intro-sound").addEventListener("click",event=>{
    introAudio=!introAudio;
    if(introAudio) actx();
    introNextTone=0;
    event.currentTarget.setAttribute("aria-pressed",String(introAudio));
    event.currentTarget.textContent=introAudio?"🔊 Desactivar sonido":"🔇 Activar sonido";
  });

  chartParticipants=initialNames.map(name=>DATA.find(d=>d.nombre===name));
  selectedRanking=chartParticipants[0];
  rebuildIntro();
  render();
})();
