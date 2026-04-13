import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import AnnouncementBar from './components/AnnouncementBar';
import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import WhatsAppButton  from './components/WhatsAppButton';
import Cursor          from './components/Cursor';
import ProtectedRoute  from './components/ProtectedRoute';
import LandingPage     from './pages/LandingPage';
import Gallery         from './pages/Gallery';
import GetAQuote       from './pages/GetAQuote';
import Materials       from './pages/Materials';
import Process         from './pages/Process';
import ProductModalPage from './pages/ProductModalPage';
import Checkout           from './pages/Checkout';
import OrderConfirmation  from './pages/OrderConfirmation';
import AdminLogin         from './pages/admin/Login';
import AdminOrders        from './pages/admin/Orders';
import AdminProducts      from './pages/admin/Products';

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
      <Routes location={backgroundLocation || location}>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/gallery"   element={<Gallery />} />
        <Route path="/quote"     element={<GetAQuote />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/process"   element={<Process />} />
        <Route path="/products/:slug" element={<ProductModalPage />} />
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
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Cursor />
      <Routes>
        {/* Admin routes — no site chrome */}
        <Route path="/admin/login" element={<AdminLogin />} />
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

        {/* Main site */}
        <Route path="/*" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  );
}
