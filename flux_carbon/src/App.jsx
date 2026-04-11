import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import AnnouncementBar from './components/AnnouncementBar';
import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import WhatsAppButton  from './components/WhatsAppButton';
import Cursor          from './components/Cursor';
import LandingPage     from './pages/LandingPage';
import Gallery         from './pages/Gallery';
import GetAQuote       from './pages/GetAQuote';
import Materials       from './pages/Materials';
import Process         from './pages/Process';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Layout() {
  return (
    <div className="grain-overlay">
      <Cursor />
      <AnnouncementBar />
      <Navbar />
      <ScrollToTop />
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/gallery"   element={<Gallery />} />
        <Route path="/quote"     element={<GetAQuote />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/process"   element={<Process />} />
      </Routes>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
