const BORRADOR_KEY = 'biela_rodada_en_curso';
const COLA_KEY = 'biela_rodadas_pendientes';

export const RODADAS_SYNC_EVENT = 'biela:rodadas-sincronizadas';

let sincronizando = false;

function leerJson(clave, alternativo) {
  try {
    const contenido = localStorage.getItem(clave);
    if (!contenido) return alternativo;
    const valor = JSON.parse(contenido);
    return valor ?? alternativo;
  } catch {
    return alternativo;
  }
}

function escribirJson(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function crearLocalId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
    const aleatorio = Math.floor(Math.random() * 16);
    const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
    return valor.toString(16);
  });
}

export function esErrorDeRed(error) {
  const mensaje = String(error?.message ?? error?.error?.message ?? error ?? '').toLowerCase();
  return [
    'failed to fetch',
    'networkerror',
    'network request failed',
    'network error',
    'fetch failed',
    'load failed',
  ].some((fragmento) => mensaje.includes(fragmento));
}

export function obtenerBorradorRodadaActiva() {
  const borrador = leerJson(BORRADOR_KEY, null);
  if (!borrador || typeof borrador !== 'object' || !borrador.motoId) return null;
  return borrador;
}

export function guardarBorradorRodadaActiva(data) {
  try {
    return escribirJson(BORRADOR_KEY, {
      ...data,
      ruta: Array.isArray(data?.ruta) ? data.ruta.slice(-500) : [],
      actualizadoEn: Date.now(),
    });
  } catch {
    return false;
  }
}

export function limpiarBorradorRodadaActiva() {
  try {
    localStorage.removeItem(BORRADOR_KEY);
    return true;
  } catch {
    return false;
  }
}

export function encolarRodadaPendiente(payloadRodada) {
  try {
    const localId = payloadRodada?.localId || crearLocalId();
    const actuales = obtenerRodadasPendientes();
    const nueva = {
      localId,
      createdAt: payloadRodada?.createdAt || new Date().toISOString(),
      rodadaData: payloadRodada?.rodadaData && typeof payloadRodada.rodadaData === 'object'
        ? payloadRodada.rodadaData
        : {},
      sumarOdometro: Boolean(payloadRodada?.sumarOdometro),
      kmASumar: Math.max(0, Math.round(Number(payloadRodada?.kmASumar) || 0)),
      motoId: payloadRodada?.motoId || payloadRodada?.rodadaData?.moto_id || null,
      insertConfirmado: Boolean(payloadRodada?.insertConfirmado),
      odometroAplicado: Boolean(payloadRodada?.odometroAplicado),
    };
    const indice = actuales.findIndex((pendiente) => pendiente.localId === localId);
    if (indice >= 0) actuales[indice] = { ...actuales[indice], ...nueva };
    else actuales.push(nueva);
    return escribirJson(COLA_KEY, actuales) ? localId : null;
  } catch {
    return null;
  }
}

export function obtenerRodadasPendientes() {
  const datos = leerJson(COLA_KEY, []);
  if (!Array.isArray(datos)) return [];
  return datos.filter((pendiente) => pendiente && typeof pendiente === 'object' && pendiente.localId);
}

export async function sincronizarRodadasPendientes(clienteSupabase) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sincronizadas: 0, fallidas: 0 };
  }
  if (!clienteSupabase || sincronizando) return { sincronizadas: 0, fallidas: 0 };

  sincronizando = true;
  let sincronizadas = 0;
  let fallidas = 0;

  try {
    let restantes = obtenerRodadasPendientes();

    for (const pendiente of restantes) {
      try {
        const datosInsert = { ...(pendiente.rodadaData || {}), id: pendiente.localId };

        if (!datosInsert.user_id) {
          const { data: { user } } = await clienteSupabase.auth.getUser();
          if (!user) throw new Error('Sesión no disponible para sincronizar la rodada.');
          datosInsert.user_id = user.id;
        }

        if (!pendiente.insertConfirmado) {
          const { error: errorInsert } = await clienteSupabase
            .from('rodadas_telemetria')
            .upsert(datosInsert, { onConflict: 'id' });
          if (errorInsert) throw errorInsert;
        }
        pendiente.insertConfirmado = true;

        if (pendiente.sumarOdometro && !pendiente.odometroAplicado) {
          const { data: motoActual, error: errorMoto } = await clienteSupabase
            .from('motos')
            .select('kilometraje')
            .eq('id', pendiente.motoId)
            .single();
          if (errorMoto) throw errorMoto;

          const kilometraje = Math.max(0, Number(motoActual?.kilometraje) || 0) + Math.round(Number(pendiente.kmASumar) || 0);
          const { error: errorUpdate } = await clienteSupabase
            .from('motos')
            .update({ kilometraje })
            .eq('id', pendiente.motoId);
          if (errorUpdate) throw errorUpdate;
          pendiente.odometroAplicado = true;
        }

        restantes = restantes.filter((item) => item.localId !== pendiente.localId);
        sincronizadas += 1;
        escribirJson(COLA_KEY, restantes);
      } catch {
        fallidas += 1;
        escribirJson(COLA_KEY, restantes);
      }
    }

    escribirJson(COLA_KEY, restantes);
  } finally {
    sincronizando = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(RODADAS_SYNC_EVENT, {
        detail: { sincronizadas, fallidas },
      }));
    }
  }

  return { sincronizadas, fallidas };
}
