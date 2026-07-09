import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Search from './pages/Search';
import Deals from './pages/Deals';
import Marketplace from './pages/Marketplace';
import Roommates from './pages/Roommates';
import Events from './pages/Events';
import Radio from './pages/Radio';
import LocalInfo from './pages/LocalInfo';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Routes>
          {/* Standalone auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Shell layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="deals" element={<Deals />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="roommates" element={<Roommates />} />
            <Route path="events" element={<Events />} />
            <Route path="radio" element={<Radio />} />
            <Route path="local-info" element={<LocalInfo />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </LocationProvider>
    </AuthProvider>
  );
}
