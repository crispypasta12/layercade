import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import AnnouncementBar from './components/AnnouncementBar';
import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import WhatsAppButton  from './components/WhatsAppButton';
import ProtectedRoute  from './components/ProtectedRoute';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Gallery = lazy(() => import('./pages/Gallery'));
const GetAQuote = lazy(() => import('./pages/GetAQuote'));
const Materials = lazy(() => import('./pages/Materials'));
const Process = lazy(() => import('./pages/Process'));
const ProductModalPage = lazy(() => import('./pages/ProductModalPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const CostCalculator = lazy(() => import('./pages/admin/CostCalculator'));
const InvoiceMaker = lazy(() => import('./pages/admin/InvoiceMaker'));
const AdminTasks = lazy(() => import('./pages/admin/Tasks'));
const AdminExpenses = lazy(() => import('./pages/admin/Expenses'));
const AdminColors   = lazy(() => import('./pages/admin/Colors'));
const AdminReviews  = lazy(() => import('./pages/admin/Reviews'));

function RouteFallback() {
  return <div className="min-h-screen bg-[#080808]" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.startsWith('/products/')) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

function Layout() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <div className="grain-overlay">
      <AnnouncementBar />
      <Navbar />
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes location={backgroundLocation || location}>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/gallery"   element={<Gallery />} />
          <Route path="/quote"     element={<GetAQuote />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/process"   element={<Process />} />
          <Route path="/products/:slug" element={<ProductModalPage />} />
          <Route path="/shop"               element={<ShopPage />} />
          <Route path="/shop/:categorySlug" element={<ShopPage />} />
          <Route path="/checkout"            element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Routes>
        <AnimatePresence>
          {backgroundLocation && (
            <Routes location={location} key={location.pathname}>
              <Route path="/products/:slug" element={<ProductModalPage />} />
            </Routes>
          )}
        </AnimatePresence>
      </Suspense>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Admin routes — no site chrome */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute>
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute>
              <AdminCategories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/calculator"
          element={
            <ProtectedRoute>
              <CostCalculator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invoices"
          element={
            <ProtectedRoute>
              <InvoiceMaker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tasks"
          element={
            <ProtectedRoute>
              <AdminTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/expenses"
          element={
            <ProtectedRoute>
              <AdminExpenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/colors"
          element={
            <ProtectedRoute>
              <AdminColors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute>
              <AdminReviews />
            </ProtectedRoute>
          }
        />

        {/* Main site */}
        <Route path="/*" element={<Layout />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    <SpeedInsights />
    </>
  );
}
