/** US prescriber DEA: 2 letters + 7 digits (demo validation). */
export function isValidDeaNumber(value) {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return false
  return /^[A-Z]{2}\d{7}$/.test(s)
}

/**
 * @param {Array<object>} items Cart lines
 * @param {{ modules?: { prescriptions?: boolean } }} tenantConfig
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateRxCartLines(items, tenantConfig) {
  if (!tenantConfig?.modules?.prescriptions) return { ok: true, errors: [] }
  const errors = []

  for (const it of items) {
    const rxNum = String(it.rxNumber ?? '').trim()
    const prescriber = String(it.prescriber ?? '').trim()
    const dob = String(it.patientDOB ?? '').trim()
    const dea = String(it.deaNumber ?? '').trim()
    const isRxLike =
      Boolean(it.controlled) || Boolean(rxNum) || Boolean(prescriber)

    if (!isRxLike) continue

    if (!rxNum) errors.push(`${it.name}: Rx # is required for this line.`)

    if (!dob) errors.push(`${it.name}: Patient DOB is required.`)

    if (prescriber && !isValidDeaNumber(dea)) {
      errors.push(
        `${it.name}: Prescriber DEA must be 2 letters + 7 digits (e.g. FA1234567).`,
      )
    }

    const auth = Number(it.refillsAuthorized)
    const rem = Number(it.refillsRemaining)
    if (prescriber || it.controlled) {
      if (!Number.isFinite(auth) || auth < 0 || auth > 11) {
        errors.push(`${it.name}: Refills authorized must be a number from 0 to 11.`)
      }
      if (!Number.isFinite(rem) || rem < 0) {
        errors.push(`${it.name}: Refills remaining must be a number ≥ 0.`)
      }
      if (Number.isFinite(auth) && Number.isFinite(rem) && rem > auth) {
        errors.push(
          `${it.name}: Refills remaining cannot exceed refills authorized.`,
        )
      }
    }

    if (it.controlled) {
      if (!prescriber) {
        errors.push(`${it.name}: Prescriber is required for controlled substances.`)
      }
      if (!isValidDeaNumber(dea)) {
        errors.push(`${it.name}: Valid prescriber DEA # is required for controlled substances.`)
      }
      if (!it.pickupVerified) {
        errors.push(
          `${it.name}: Confirm pickup ID check before completing a controlled sale.`,
        )
      }
      const last4 = String(it.pickupIdLast4 ?? '').trim()
      if (!/^\d{4}$/.test(last4)) {
        errors.push(
          `${it.name}: Pickup verification needs the last 4 digits of photo ID (exactly 4 digits).`,
        )
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
