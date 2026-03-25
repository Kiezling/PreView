/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Zener } from './pages/Zener';
import { AstroTarot } from './pages/AstroTarot';
import { ColorTarget } from './pages/Color';
import { Stock } from './pages/Stock';
import { StandardDeck } from './pages/StandardDeck';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="zener" element={<Zener />} />
            <Route path="color" element={<ColorTarget />} />
            <Route path="standard-deck" element={<StandardDeck />} />
            <Route path="astro-tarot" element={<AstroTarot />} />
            <Route path="stock" element={<Stock />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<Admin />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
