const phase = (message: string) => window.dispatchEvent(new CustomEvent('hdt-update-phase', { detail: message }))
const ready = () => {
  window.__HDT_UPDATE_PENDING__ = true
  window.dispatchEvent(new Event('hdt-update-ready'))
}
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registration = navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
  registration.then(reg => {
    if (reg.waiting) ready()
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) ready()
      })
    })
  }).catch(() => undefined)
  window.__HDT_CHECK_SW__ = async () => { await (await registration).update() }
  const check = () => {
    if (navigator.onLine && document.visibilityState === 'visible') void window.__HDT_CHECK_SW__?.().catch(() => undefined)
  }
  document.addEventListener('visibilitychange', check)
  window.addEventListener('online', check)
  window.setInterval(check, 3600000)
  window.__HDT_UPDATE_SW__ = async () => {
    phase('download')
    const reg = await registration
    if (!reg.waiting) await reg.update()
    await new Promise<void>((resolve, reject) => {
      const started = Date.now()
      const timer = window.setInterval(() => {
        if (reg.waiting) { clearInterval(timer); resolve() }
        else if (Date.now() - started > 30000) { clearInterval(timer); reject(new Error('Update not ready')) }
      }, 100)
    })
    const worker = reg.waiting!
    phase('activate')
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        if (navigator.serviceWorker.controller === worker) { cleanup(); resolve() }
      }
      const timer = window.setTimeout(() => { cleanup(); reject(new Error('Activation timeout')) }, 20000)
      const cleanup = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', done) }
      navigator.serviceWorker.addEventListener('controllerchange', done)
      worker.postMessage({ type: 'SKIP_WAITING' })
      done()
    })
    phase('reload')
    try { sessionStorage.setItem('hdt-updated-from', 'v3.3.1') } catch { /* optional */ }
    window.location.reload()
  }
}
