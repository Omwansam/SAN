import { lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PlatformLayout } from './components/layout/PlatformLayout'
import { PlatformProtectedRoute } from './components/layout/PlatformProtectedRoute'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Spinner } from './components/shared/Spinner'
import { AuthProvider } from './contexts/AuthContext'
import { BranchProvider } from './contexts/BranchContext'
import { CartProvider } from './contexts/CartContext'
import { CustomerProvider } from './contexts/CustomerContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { OrderProvider } from './contexts/OrderContext'
import { ProductProvider } from './contexts/ProductContext'
import { TenantProvider } from './contexts/TenantContext'
import { UIProvider } from './contexts/UIContext'

const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const BusinessTypeSelection = lazy(() => import('./pages/BusinessTypeSelection'))
const POS = lazy(() => import('./pages/POS'))
const CustomerDisplay = lazy(() => import('./pages/CustomerDisplay'))
const Orders = lazy(() => import('./pages/Orders'))
const Products = lazy(() => import('./pages/Products'))
const Categories = lazy(() => import('./pages/Categories'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Customers = lazy(() => import('./pages/Customers'))
const Tables = lazy(() => import('./pages/Tables'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Kitchen = lazy(() => import('./pages/Kitchen'))
const Reports = lazy(() => import('./pages/Reports'))
const ReportsExport = lazy(() => import('./pages/ReportsExport'))
const Settings = lazy(() => import('./pages/Settings'))
const SettingsUsers = lazy(() => import('./pages/SettingsUsers'))
const SettingsRegisters = lazy(() => import('./pages/SettingsRegisters'))
const SettingsBranches = lazy(() => import('./pages/SettingsBranches'))
const SettingsReceipt = lazy(() => import('./pages/SettingsReceipt'))
const SettingsBackup = lazy(() => import('./pages/SettingsBackup'))
const SettingsBilling = lazy(() => import('./pages/SettingsBilling'))
const SettingsNotifications = lazy(() => import('./pages/SettingsNotifications'))
const SettingsSuppliers = lazy(() => import('./pages/SettingsSuppliers'))
const SettingsTaxRates = lazy(() => import('./pages/SettingsTaxRates'))
const InventoryLogs = lazy(() => import('./pages/InventoryLogs'))
const PlatformOverview = lazy(() => import('./pages/PlatformOverview'))
const PlatformAnalytics = lazy(() => import('./pages/PlatformAnalytics'))
const PlatformTenants = lazy(() => import('./pages/PlatformTenants'))
const PlatformDesignSystem = lazy(() => import('./pages/PlatformDesignSystem'))
const PlatformBilling = lazy(() => import('./pages/PlatformBilling'))
const PlatformBroadcasts = lazy(() => import('./pages/PlatformBroadcasts'))
const PlatformSecurity = lazy(() => import('./pages/PlatformSecurity'))
const PlatformTenantDetail = lazy(() => import('./pages/PlatformTenantDetail'))
const PlatformTenantUsers = lazy(() => import('./pages/PlatformTenantUsers'))
const PlatformTenantOrders = lazy(() => import('./pages/PlatformTenantOrders'))
const PlatformTenantPayments = lazy(() => import('./pages/PlatformTenantPayments'))
const PlatformTenantDesign = lazy(() => import('./pages/PlatformTenantDesign'))
const PlatformSubscriptions = lazy(() => import('./pages/PlatformSubscriptions'))
const PlatformInvoices = lazy(() => import('./pages/PlatformInvoices'))
const PlatformFeatureFlags = lazy(() => import('./pages/PlatformFeatureFlags'))
const PlatformReleases = lazy(() => import('./pages/PlatformReleases'))
const PlatformSupport = lazy(() => import('./pages/PlatformSupport'))
const PlatformAudit = lazy(() => import('./pages/PlatformAudit'))
const PlatformSettings = lazy(() => import('./pages/PlatformSettings'))

function Page({ children }) {
  return <Suspense fallback={<Spinner label="Loading page" />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Toaster position="bottom-right" />
      <UIProvider>
        <TenantProvider>
          <AuthProvider>
            <BranchProvider>
              <ProductProvider>
                <OrderProvider>
                  <CustomerProvider>
                    <CartProvider>
                      <NotificationProvider>
                        <a
                          href="#main-content"
                          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg dark:focus:bg-gray-900"
                        >
                          Skip to main content
                        </a>
                        <div id="main-content">
                          <Routes>
                        <Route
                          path="/"
                          element={<Navigate to="/login" replace />}
                        />
                        <Route
                          path="/login"
                          element={
                            <Page>
                              <Login />
                            </Page>
                          }
                        />
                        <Route
                          path="/onboarding"
                          element={
                            <Page>
                              <Onboarding />
                            </Page>
                          }
                        />
                        <Route element={<PlatformProtectedRoute />}>
                          <Route element={<PlatformLayout />}>
                            <Route
                              path="/platform"
                              element={
                                <Page>
                                  <PlatformOverview />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/tenants"
                              element={
                                <Page>
                                  <PlatformTenants />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/analytics"
                              element={
                                <Page>
                                  <PlatformAnalytics />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/design-system"
                              element={
                                <Page>
                                  <PlatformDesignSystem />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/billing"
                              element={
                                <Page>
                                  <PlatformBilling />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/subscriptions"
                              element={
                                <Page>
                                  <PlatformSubscriptions />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/invoices"
                              element={
                                <Page>
                                  <PlatformInvoices />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/feature-flags"
                              element={
                                <Page>
                                  <PlatformFeatureFlags />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/releases"
                              element={
                                <Page>
                                  <PlatformReleases />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/broadcasts"
                              element={
                                <Page>
                                  <PlatformBroadcasts />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/security"
                              element={
                                <Page>
                                  <PlatformSecurity />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/support"
                              element={
                                <Page>
                                  <PlatformSupport />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/audit"
                              element={
                                <Page>
                                  <PlatformAudit />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/settings"
                              element={
                                <Page>
                                  <PlatformSettings />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/tenants/:tenantId"
                              element={
                                <Page>
                                  <PlatformTenantDetail />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/tenants/:tenantId/users"
                              element={
                                <Page>
                                  <PlatformTenantUsers />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/tenants/:tenantId/orders"
                              element={
                                <Page>
                                  <PlatformTenantOrders />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/tenants/:tenantId/payments"
                              element={
                                <Page>
                                  <PlatformTenantPayments />
                                </Page>
                              }
                            />
                            <Route
                              path="/platform/tenants/:tenantId/design"
                              element={
                                <Page>
                                  <PlatformTenantDesign />
                                </Page>
                              }
                            />
                          </Route>
                        </Route>
                        <Route element={<ProtectedRoute />}>
                          <Route
                            path="/business-type"
                            element={
                              <Page>
                                <BusinessTypeSelection />
                              </Page>
                            }
                          />
                          <Route element={<AppLayout />}>
                            <Route
                              path="/pos"
                              element={
                                <Page>
                                  <POS />
                                </Page>
                              }
                            />
                            <Route
                              path="/pos/orders"
                              element={
                                <Page>
                                  <Orders />
                                </Page>
                              }
                            />
                            <Route
                              path="/products"
                              element={
                                <Page>
                                  <Products />
                                </Page>
                              }
                            />
                            <Route
                              path="/products/categories"
                              element={
                                <Page>
                                  <Categories />
                                </Page>
                              }
                            />
                            <Route
                              path="/inventory"
                              element={
                                <Page>
                                  <Inventory />
                                </Page>
                              }
                            />
                            <Route
                              path="/customers"
                              element={
                                <Page>
                                  <Customers />
                                </Page>
                              }
                            />
                            <Route
                              path="/tables"
                              element={
                                <Page>
                                  <Tables />
                                </Page>
                              }
                            />
                            <Route
                              path="/appointments"
                              element={
                                <Page>
                                  <Appointments />
                                </Page>
                              }
                            />
                            <Route
                              path="/kitchen"
                              element={
                                <Page>
                                  <Kitchen />
                                </Page>
                              }
                            />
                            <Route
                              path="/reports"
                              element={
                                <Page>
                                  <Reports />
                                </Page>
                              }
                            />
                            <Route
                              path="/reports/export"
                              element={
                                <Page>
                                  <ReportsExport />
                                </Page>
                              }
                            />
                            <Route
                              path="/settings"
                              element={
                                <Page>
                                  <Settings />
                                </Page>
                              }
                            />
                            <Route
                              path="/settings/users"
                              element={
                                <Page>
                                  <SettingsUsers />
                                </Page>
                              }
                            />
                        <Route
                          path="/settings/registers"
                          element={
                            <Page>
                              <SettingsRegisters />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/branches"
                          element={
                            <Page>
                              <SettingsBranches />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/receipt"
                          element={
                            <Page>
                              <SettingsReceipt />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/backup"
                          element={
                            <Page>
                              <SettingsBackup />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/billing"
                          element={
                            <Page>
                              <SettingsBilling />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/notifications"
                          element={
                            <Page>
                              <SettingsNotifications />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/suppliers"
                          element={
                            <Page>
                              <SettingsSuppliers />
                            </Page>
                          }
                        />
                        <Route
                          path="/settings/tax-rates"
                          element={
                            <Page>
                              <SettingsTaxRates />
                            </Page>
                          }
                        />
                        <Route
                          path="/inventory/logs"
                          element={
                            <Page>
                              <InventoryLogs />
                            </Page>
                          }
                        />
                            <Route path="/superadmin" element={<Navigate to="/platform" replace />} />
                          </Route>
                          <Route
                            path="/customer-display"
                            element={
                              <Page>
                                <CustomerDisplay />
                              </Page>
                            }
                          />
                        </Route>
                        <Route
                          path="*"
                          element={<Navigate to="/login" replace />}
                        />
                          </Routes>
                        </div>
                      </NotificationProvider>
                    </CartProvider>
                  </CustomerProvider>
                </OrderProvider>
              </ProductProvider>
            </BranchProvider>
          </AuthProvider>
        </TenantProvider>
      </UIProvider>
    </BrowserRouter>
  )
}
