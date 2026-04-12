import {
  LEGACY_DEMO_LOGIN,
  LEGACY_HUB_SLUG,
  UNIFIED_POS_LOGIN,
} from './demoCategoryWorkspaces'

/** Legacy slug; same preset as pharmacy hub. */
export const DEMO_WORKSPACE_SLUG = LEGACY_HUB_SLUG

/** Backward-compatible sample block (older `demo` tenants may still use these emails). */
export const SAMPLE_LOGIN = {
  workspaceSlug: DEMO_WORKSPACE_SLUG,
  ...LEGACY_DEMO_LOGIN,
  hint: 'Category demos use admin@pos.demo — see login screen. Legacy slug `demo` may still use admin@demo.com if created earlier.',
}

export { UNIFIED_POS_LOGIN, LEGACY_DEMO_LOGIN }
