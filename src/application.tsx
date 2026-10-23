import { Navigate, Route, Routes } from 'react-router-dom'
import { entreesVisibles } from './navigation'
import { Coquille } from './pages/Coquille'
import { ECRANS } from './pages/ecrans'
import { useSessionOuverte } from './contextes/session'
import { FournisseurDemo } from './demo/FournisseurDemo'
import { BarreDemo } from './demo/BarreDemo'
import { ApercuDemo } from './demo/ApercuDemo'

function EcransDemo() {
  const { permissions, utilisateur, poste } = useSessionOuverte()
  return <Routes>
    <Route path="/api/*" element={<ApercuDemo />} />
    <Route element={<Coquille />}>
      <Route index element={<Navigate to="/tableau-de-bord" replace />} />
      {entreesVisibles(permissions, utilisateur.role, poste.type_poste).map(e => <Route key={e.chemin} path={e.chemin} element={ECRANS[e.chemin]} />)}
      <Route path="*" element={<Navigate to="/tableau-de-bord" replace />} />
    </Route>
  </Routes>
}
export function Application() { return <FournisseurDemo><BarreDemo /><EcransDemo /></FournisseurDemo> }
