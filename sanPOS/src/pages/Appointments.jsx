import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import FullCalendar from '@fullcalendar/react'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { useTenant } from '../hooks/useTenant'
import { getJSON, setJSON } from '../utils/storage'
import { newId } from '../utils/uuid'

export default function Appointments() {
  const { tenantId, tenantConfig } = useTenant()
  const [events, setEvents] = useState([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() => setEvents(getJSON(tenantId, 'appointments', [])))
  }, [tenantId])

  const persist = useCallback(
    (next) => {
      if (!tenantId) return
      setJSON(tenantId, 'appointments', next)
      setEvents(next)
    },
    [tenantId],
  )

  const handleSelect = useCallback((info) => {
    setTitle('')
    setStart(info.startStr.slice(0, 16))
    setEnd(info.endStr.slice(0, 16))
    setOpen(true)
    info.view.calendar.unselect()
  }, [])

  const handleEventChange = useCallback(
    (arg) => {
      const ev = arg.event
      setEvents((prev) => {
        const next = prev.map((e) =>
          e.id === ev.id
            ? {
                ...e,
                start: ev.start ? ev.start.toISOString() : e.start,
                end: ev.end ? ev.end.toISOString() : e.end,
              }
            : e,
        )
        if (tenantId) setJSON(tenantId, 'appointments', next)
        return next
      })
      toast.success('Updated')
    },
    [tenantId],
  )

  if (!tenantConfig?.modules?.appointments) return <Navigate to="/pos" replace />

  function add() {
    if (!title.trim() || !start || !end) {
      toast.error('Title, start, and end required')
      return
    }
    persist([
      ...events,
      {
        id: newId(),
        title: title.trim(),
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        backgroundColor: '#6366f1',
      },
    ])
    toast.success('Booked')
    setOpen(false)
    setTitle('')
    setStart('')
    setEnd('')
  }

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.backgroundColor,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Appointments
        </h1>
        <Button
          type="button"
          onClick={() => {
            setTitle('')
            setStart('')
            setEnd('')
            setOpen(true)
          }}
        >
          New booking
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-4">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay',
          }}
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          nowIndicator
          editable
          selectable
          selectMirror
          dayMaxEvents
          events={fcEvents}
          select={handleSelect}
          eventChange={handleEventChange}
        />
      </div>

      {events.length === 0 ? (
        <EmptyState title="No saved appointments" description="Drag on the grid or use New booking." />
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="font-medium">{ev.title}</p>
              <p className="text-sm text-gray-500">
                {format(new Date(ev.start), 'PPp')} – {format(new Date(ev.end), 'p')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New appointment"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={add}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Service / title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label="Start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            label="End"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
