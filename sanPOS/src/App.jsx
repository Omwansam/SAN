import { lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
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
const InventoryLogs = lazy(() => import('./pages/InventoryLogs'))
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'))

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
                          path="/inventory/logs"
                          element={
                            <Page>
                              <InventoryLogs />
                            </Page>
                          }
                        />
                            <Route
                              path="/superadmin"
                              element={
                                <Page>
                                  <SuperAdmin />
                                </Page>
                              }
                            />
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
