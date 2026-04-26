import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { getPlatformAnnouncements, savePlatformAnnouncement } from '../utils/platformData'

export default function PlatformBroadcasts() {
  const [message, setMessage] = useState('')
  const [items, setItems] = useState(getPlatformAnnouncements())

  function handleSend(e) {
    e.preventDefault()
    if (!message.trim()) {
      toast.error('Enter a message before sending.')
      return
    }
    const next = savePlatformAnnouncement(message)
    setItems(next)
    setMessage('')
    toast.success('Broadcast saved for platform admins.')
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <Megaphone className="h-6 w-6 text-cyan-300" />
          Broadcasts
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Compose global platform notices and keep announcement history.
        </p>
      </header>

      <form onSubmit={handleSend} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">New message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Scheduled maintenance tonight at 11:00 PM"
          className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit">Save broadcast</Button>
        </div>
      </form>

      <section className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
              <p className="text-sm text-slate-100">{item.message}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
            No broadcasts yet.
          </p>
        )}
      </section>
    </div>
  )
}
