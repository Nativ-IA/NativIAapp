#!/usr/bin/env node
// =============================================================================
// pnpm demo:movil — NativIA en este computador, lista para abrir desde
// celulares y tabletas con un código QR.
//
//   pnpm demo:movil            enlace público temporal (https://….trycloudflare.com)
//   pnpm demo:movil --red      solo la red local (misma Wi-Fi), sin túnel
//   pnpm demo:movil --rapido   no reinstala ni recompila (para volver a arrancar)
//
// Qué hace, en orden:
//   1. Revisa que exista .env (la cadena de Neon) e instala dependencias si
//      faltan.
//   2. Genera el cliente de Prisma y compila el front.
//   3. Arranca la API en modo producción: sirve también el front, así que todo
//      queda en UNA dirección (igual que en Cloud Run).
//   4. Abre un túnel de Cloudflare hacia esa dirección y muestra el enlace
//      público con su código QR. La página /qr del propio enlace lo dibuja en
//      grande para proyectarlo.
//
// No migra ni siembra la base: usa la que diga .env tal como está.
//
// El enlace público vive mientras este proceso esté corriendo y CAMBIA cada vez
// que se arranca: el QR se vuelve a generar solo. Ctrl+C apaga todo.
//
// Sin dependencias propias: solo Node 20+ y lo que ya instala el monorepo.
// =============================================================================

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir, networkInterfaces, platform, arch } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIN = platform() === 'win32';
const args = new Set(process.argv.slice(2));
const SOLO_RED = args.has('--red');
const RAPIDO = args.has('--rapido');
const NO_ABRIR = args.has('--no-abrir');

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  err: (s) => `\x1b[31m${s}\x1b[0m`,
  brand: (s) => `\x1b[36m${s}\x1b[0m`,
};
const paso = (n, texto) => console.log(`\n${c.brand(`[${n}/4]`)} ${c.b(texto)}`);
const fallo = (texto) => {
  console.error(`\n${c.err('✖')} ${texto}\n`);
  process.exit(1);
};

const hijos = [];
let apagando = false;
function apagar(codigo = 0) {
  apagando = true;
  for (const h of hijos) {
    try {
      h.kill();
    } catch {
      /* ya terminó */
    }
  }
  process.exit(codigo);
}
process.on('SIGINT', () => {
  console.log(`\n${c.dim('Apagando la demo…')}`);
  apagar(0);
});
process.on('SIGTERM', () => apagar(0));

// ── Utilidades ───────────────────────────────────────────────────────────────

/** Lee un .env sencillo (CLAVE=valor, con o sin comillas). */
function leerEnv(ruta) {
  const out = {};
  if (!existsSync(ruta)) return out;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || linea.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Corre un comando del monorepo con pnpm (o con npx si pnpm no está). */
function pnpm(argumentos, { silencioso = false } = {}) {
  const tienePnpm = spawnSync('pnpm --version', { shell: true, stdio: 'ignore' }).status === 0;
  const base = tienePnpm ? 'pnpm' : 'npx -y pnpm@9.0.0';
  const r = spawnSync(`${base} ${argumentos}`, {
    cwd: ROOT,
    shell: true,
    stdio: silencioso ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    if (silencioso) console.error((r.stdout ?? '') + (r.stderr ?? ''));
    fallo(`Falló «pnpm ${argumentos}». Revisa el mensaje de arriba.`);
  }
}

function puertoLibre(puerto, host) {
  return new Promise((ok) => {
    const s = createServer();
    s.once('error', () => ok(false));
    s.once('listening', () => s.close(() => ok(true)));
    s.listen(puerto, host);
  });
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function responde(url, intentos, cadaMs) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok) return await r.json().catch(() => ({}));
    } catch {
      /* todavía no */
    }
    await esperar(cadaMs);
  }
  return null;
}

function ipsDeRed() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

function abrirEnNavegador(url) {
  if (NO_ABRIR) return;
  try {
    if (WIN) spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    else spawn(platform() === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* sin navegador: el enlace queda impreso */
  }
}

/** QR en la terminal, para escanear sin abrir nada. Usa el generador que ya
 *  trae el front; si no está instalado, simplemente no se dibuja. */
function qrEnTerminal(texto) {
  try {
    const require = createRequire(join(ROOT, 'apps', 'web', 'package.json'));
    const qrcode = require('qrcode-generator');
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    const oscuro = (r, col) => r >= 0 && r < n && col >= 0 && col < n && qr.isDark(r, col);
    // Dos filas de módulos por línea de texto (▀ ▄ █): queda cuadrado. Los
    // colores van explícitos —negro sobre blanco— para que el código salga
    // bien tanto en una terminal oscura como en una clara.
    const BLANCO_NEGRO = '\x1b[107m\x1b[30m';
    const FIN = '\x1b[0m';
    let out = '';
    for (let r = -2; r < n + 2; r += 2) {
      let linea = '';
      for (let col = -2; col < n + 2; col++) {
        const arriba = oscuro(r, col);
        const abajo = oscuro(r + 1, col);
        linea += arriba && abajo ? '█' : arriba ? '▀' : abajo ? '▄' : ' ';
      }
      out += `    ${BLANCO_NEGRO}${linea}${FIN}\n`;
    }
    return out;
  } catch {
    return '';
  }
}

// ── cloudflared ──────────────────────────────────────────────────────────────

const CACHE = WIN
  ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'nativia-demo')
  : join(homedir(), '.cache', 'nativia-demo');

/** Devuelve la ruta de cloudflared. Si no está en el equipo, lo descarga de las
 *  versiones oficiales de Cloudflare en GitHub (una sola vez; queda fuera del
 *  repositorio y de OneDrive). */
async function cloudflared() {
  if (process.env.CLOUDFLARED && existsSync(process.env.CLOUDFLARED)) return process.env.CLOUDFLARED;
  if (spawnSync('cloudflared --version', { shell: true, stdio: 'ignore' }).status === 0) return 'cloudflared';

  const destino = join(CACHE, WIN ? 'cloudflared.exe' : 'cloudflared');
  if (existsSync(destino)) return destino;

  const cpu = arch() === 'arm64' ? 'arm64' : 'amd64';
  const archivo = {
    win32: 'cloudflared-windows-amd64.exe',
    linux: `cloudflared-linux-${cpu}`,
    darwin: `cloudflared-darwin-${cpu}.tgz`,
  }[platform()];
  if (!archivo) return null;

  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${archivo}`;
  console.log(`  Descargando cloudflared (herramienta oficial de Cloudflare, ~55 MB, una sola vez)`);
  console.log(c.dim(`  ${url}`));
  console.log(c.dim(`  → ${destino}`));

  mkdirSync(CACHE, { recursive: true });
  const r = await fetch(url);
  if (!r.ok) {
    console.log(c.warn(`  No se pudo descargar (HTTP ${r.status}).`));
    return null;
  }
  const bytes = Buffer.from(await r.arrayBuffer());
  if (archivo.endsWith('.tgz')) {
    const tgz = join(CACHE, archivo);
    writeFileSync(tgz, bytes);
    if (spawnSync('tar', ['-xzf', tgz, '-C', CACHE], { stdio: 'ignore' }).status !== 0) return null;
  } else {
    // Se escribe con otro nombre y se renombra al final: una descarga cortada
    // no deja un ejecutable a medias que la próxima vez se daría por bueno.
    writeFileSync(`${destino}.parcial`, bytes);
    renameSync(`${destino}.parcial`, destino);
  }
  if (!WIN) chmodSync(destino, 0o755);
  return destino;
}

function abrirTunel(bin, puerto) {
  return new Promise((ok) => {
    const h = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${puerto}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: bin === 'cloudflared' && WIN,
    });
    hijos.push(h);
    let resuelto = false;
    let ultimo = '';
    const leer = (trozo) => {
      const texto = trozo.toString();
      ultimo = (ultimo + texto).slice(-2000);
      const m = texto.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (m && !resuelto) {
        resuelto = true;
        ok({ url: m[0] });
      }
    };
    h.stdout.on('data', leer);
    h.stderr.on('data', leer);
    h.once('error', (e) => !resuelto && ((resuelto = true), ok({ error: String(e) })));
    h.once('exit', (codigo) => {
      if (apagando) return;
      if (!resuelto) {
        resuelto = true;
        ok({ error: `cloudflared terminó (código ${codigo}).\n${ultimo}` });
      } else {
        console.log(c.warn('\nEl túnel se cerró. Vuelve a correr «pnpm demo:movil» para un enlace nuevo.'));
        apagar(1);
      }
    });
    setTimeout(() => !resuelto && ((resuelto = true), ok({ error: 'El túnel no respondió en 45 segundos.' })), 45000);
  });
}

// ── 1. Preparación ───────────────────────────────────────────────────────────

console.log(c.b('\nNativIA · demo para celulares y tabletas'));

const nodeMayor = Number(process.versions.node.split('.')[0]);
if (nodeMayor < 20) fallo(`Se necesita Node 20 o superior (tienes ${process.versions.node}).`);

paso(1, 'Revisando el proyecto');
const env = leerEnv(join(ROOT, '.env'));
if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL ?? '')) {
  fallo(
    'Falta el archivo .env con DATABASE_URL (la cadena de Neon con pooler).\n' +
      '  Copia .env.example como .env y pega la cadena de tu rama de Neon.',
  );
}
console.log(`  ${c.ok('✓')} .env con la base de datos`);

if (RAPIDO && existsSync(join(ROOT, 'apps', 'web', 'dist', 'index.html'))) {
  console.log(c.dim('  --rapido: se usa lo ya instalado y compilado'));
} else {
  // Siempre, no solo la primera vez: si alguien agregó una dependencia, el
  // build fallaría con un error que no dice que falta instalar. Cuando todo
  // está al día pnpm termina en un par de segundos.
  console.log('  Instalando dependencias (la primera vez tarda unos minutos)…');
  pnpm('install');
  console.log(`  ${c.ok('✓')} dependencias`);

  // ── 2. Cliente de Prisma y front ───────────────────────────────────────────

  paso(2, 'Compilando');
  pnpm('--filter @nativia/db generate', { silencioso: true });
  console.log(`  ${c.ok('✓')} cliente de la base de datos`);
  pnpm('--filter @nativia/web build', { silencioso: true });
  console.log(`  ${c.ok('✓')} front (apps/web/dist)`);
}

// ── 3. API + front en una sola dirección ─────────────────────────────────────

paso(3, 'Arrancando NativIA');
const host = SOLO_RED ? '0.0.0.0' : '127.0.0.1';
let puerto = Number(env.DEMO_PORT || 3000);
while (!(await puertoLibre(puerto, host))) puerto += 1;

const api = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
  cwd: join(ROOT, 'apps', 'api'),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(puerto),
    HOST: host,
    // Si .env no trae un secreto válido, uno de un solo uso: las sesiones
    // duran lo que dure esta demo.
    JWT_SECRET: (env.JWT_SECRET ?? '').length >= 16 ? env.JWT_SECRET : randomBytes(24).toString('hex'),
  },
});
hijos.push(api);
let registro = '';
const guardar = (t) => (registro = (registro + t.toString()).slice(-4000));
api.stdout.on('data', guardar);
api.stderr.on('data', guardar);
api.once('exit', (codigo) => {
  if (apagando) return;
  console.error(c.err(`\nLa API se detuvo (código ${codigo}). Últimas líneas:\n`) + registro);
  apagar(1);
});

const local = `http://127.0.0.1:${puerto}`;
const salud = await responde(`${local}/v1/health`, 60, 500);
if (!salud) fallo('La API no respondió. Últimas líneas:\n' + registro);
if (salud.database !== 'ok') {
  console.log(
    c.warn('  ⚠ La app arrancó pero NO pudo conectarse a la base de datos.') +
      '\n    Revisa DATABASE_URL en .env (¿la rama de Neon existe y está activa?).',
  );
} else {
  console.log(`  ${c.ok('✓')} app y base de datos en ${local}`);
}

// ── 4. Dirección para los celulares ──────────────────────────────────────────

let publica = null;
if (SOLO_RED) {
  paso(4, 'Dirección en la red local');
} else {
  paso(4, 'Abriendo el enlace público');
  const bin = await cloudflared();
  if (!bin) {
    console.log(c.warn('  No hay cloudflared para este sistema. Instálalo o usa «pnpm demo:movil --red».'));
  } else {
    const t = await abrirTunel(bin, puerto);
    if (t.error) {
      console.log(c.warn(`  No se pudo abrir el túnel: ${t.error}`));
    } else {
      publica = t.url;
      // El nombre nuevo tarda unos segundos en resolverse en internet.
      const lista = await responde(`${publica}/v1/health`, 20, 1500);
      console.log(
        lista
          ? `  ${c.ok('✓')} enlace público activo`
          : c.warn('  El enlace ya existe pero todavía no responde desde este equipo; dale unos segundos.'),
      );
    }
  }
}

const ips = ipsDeRed();
const destino = publica ?? (SOLO_RED && ips[0] ? `http://${ips[0]}:${puerto}` : null);

console.log('\n' + '─'.repeat(64));
if (destino) {
  console.log(`\n  ${c.b('Abre NativIA desde cualquier celular o tableta:')}\n`);
  console.log(`      ${c.brand(c.b(destino + '/'))}\n`);
  process.stdout.write(qrEnTerminal(destino + '/'));
  console.log(`\n  QR en grande, para proyectar:  ${c.b(destino + '/qr')}`);
  if (publica) {
    console.log(c.dim('  Funciona desde cualquier red mientras esta ventana siga abierta.'));
    console.log(c.dim('  El enlace cambia cada vez que arrancas la demo.'));
  } else {
    console.log(c.dim('  Solo para dispositivos en la MISMA red Wi-Fi que este computador.'));
    console.log(c.dim('  Si Windows pregunta por el firewall, permite a Node en redes privadas.'));
    for (const ip of ips.slice(1)) console.log(c.dim(`  Otra dirección de este equipo: http://${ip}:${puerto}/`));
  }
} else {
  console.log(`\n  ${c.warn('Sin dirección para otros dispositivos.')} En este computador: ${c.b(local + '/')}`);
}
console.log(`\n  En este computador:  ${local}/`);
console.log(`  Ingreso de demostración: código de curso y cuentas en README.md`);
console.log(`\n  ${c.b('Ctrl+C')} para apagar.\n`);
console.log('─'.repeat(64) + '\n');

abrirEnNavegador(destino ? `${destino}/qr` : `${local}/`);
