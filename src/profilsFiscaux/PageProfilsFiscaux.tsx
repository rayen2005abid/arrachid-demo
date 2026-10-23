import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, Choix } from '../administration/composants'
import { AfficheErreur } from '../composants/AfficheErreur'
import { EnTeteEcran, type MessageEcran } from '../composants/EnTeteEcran'
import { ValidationPin } from '../composants/ValidationPin'
import { Tiroir } from '../composants/Tiroir'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { formaterHorodatage } from '../format/dates'
import { libelles } from '../libelles'
import type { Validation } from '../types'
import {
  corpsProfil, millimesEnDinars, ouvertureAutorisee, ppmEnPourcent, SAISIE_VIDE, saisieDe,
  type ListeProfils, type ProfilFiscal, type RegimeTva, type SaisieProfil, type TypeOperation,
} from './logique'

const t = libelles.profilsFiscaux
const REGIMES: readonly RegimeTva[] = ['normal', 'suspension', 'export']

/** Profils fiscaux du propriétaire (CONTEXTE §23.2) : versions datées, jamais réécrites. */
export function PageProfilsFiscaux() {
  const liste = useLecture<ListeProfils>('/api/profils-fiscaux')
  const soumission = useSoumission()
  const [saisie, definirSaisie] = useState<SaisieProfil | null>(null)
  const [validation, definirValidation] = useState<Validation | null>(null)
  const [erreurLocale, definirErreurLocale] = useState<string | null>(null)
  const [message, definirMessage] = useState<MessageEcran | null>(null)
  const donnees = liste.donnees

  const ouvrir = (suivante: SaisieProfil | null) => {
    soumission.reinitialiser()
    definirValidation(null)
    definirErreurLocale(null)
    definirSaisie(suivante)
  }
  const changer = <K extends keyof SaisieProfil>(cle: K, valeur: SaisieProfil[K]) => {
    definirSaisie((avant) => (avant === null ? avant : { ...avant, [cle]: valeur }))
    definirErreurLocale(null)
  }

  const enregistrer = async () => {
    if (saisie === null || donnees === null) return
    const r = corpsProfil(saisie, donnees, validation)
    definirErreurLocale(r.erreur)
    if (r.corps === null) return
    const reponse = await soumission.soumettre<{ profil_fiscal: ProfilFiscal }>('/api/profils-fiscaux', r.corps)
    if (reponse === null) return
    definirMessage({ texte: t.enregistre.replace('{code}', reponse.profil_fiscal.code), type: 'ok' })
    ouvrir(null)
    await liste.recharger()
  }

  return <section>
    <EnTeteEcran titre={libelles.ecrans.profilsFiscaux} message={message}
      principal={saisie === null ? { etiquette: t.nouveau, surClic: () => ouvrir({ ...SAISIE_VIDE }) } : null} />
    <div className="mes-page">
      <p className="aide">{t.aide}</p>
      <AfficheErreur erreur={liste.erreur} />
      {saisie !== null && donnees !== null && <Tiroir titre={t.nouvelleVersion} etiquette={t.enregistrer}
        enCours={soumission.enCours} erreur={erreurLocale ?? soumission.erreur} consequence={t.consequence}
        surValider={() => void enregistrer()} surFermer={() => ouvrir(null)}>
        <Champ id="code-profil" libelle={t.code} valeur={saisie.code} surChangement={(v) => changer('code', v)} autoFocus />
        <Champ id="libelle-profil" libelle={t.libelle} valeur={saisie.libelle} surChangement={(v) => changer('libelle', v)} />
        <Choix id="type-profil" libelle={t.typeOperation} valeur={saisie.type_operation} surChangement={(v) => changer('type_operation', (v || 'vente_vrac') as TypeOperation)}
          options={donnees.types_operation.map((o) => ({ valeur: o, libelle: t.types[o] }))} />
        <Choix id="regime-profil" libelle={t.regime} valeur={saisie.regime_tva_client} surChangement={(v) => changer('regime_tva_client', (v || 'normal') as RegimeTva)}
          options={REGIMES.map((r) => ({ valeur: r, libelle: libelles.clients.regimes[r] }))} />
        <Champ id="tva-profil" libelle={t.tva} valeur={saisie.tva} surChangement={(v) => changer('tva', v)} inputMode="decimal" decimales={4} />
        <Champ id="parafiscal-profil" libelle={t.parafiscal} valeur={saisie.parafiscal} surChangement={(v) => changer('parafiscal', v)} inputMode="decimal" decimales={4} />
        <label className="mes-case"><input type="checkbox" checked={saisie.dansBase} onChange={(e) => changer('dansBase', e.target.checked)} />{t.dansBase}</label>
        <Champ id="timbre-profil" libelle={t.timbre} valeur={saisie.timbre} surChangement={(v) => changer('timbre', v)} inputMode="decimal" />
        {ouvertureAutorisee(donnees) && <label className="mes-case"><input type="checkbox" checked={saisie.depuisOuverture} onChange={(e) => changer('depuisOuverture', e.target.checked)} />{t.depuisOuverture}</label>}
        <Champ id="motif-profil" libelle={t.motif} valeur={saisie.motif} surChangement={(v) => changer('motif', v)} />
        <ValidationPin seulProprietaire surValidation={definirValidation} />
      </Tiroir>}

      {donnees?.profils.length === 0 && <p className="aide">{t.aucun}</p>}
      {donnees !== null && donnees.profils.length > 0 && <Panneau titre={libelles.ecrans.profilsFiscaux} serre><div className="mes-tableau"><table className="tableau-admin">
        <thead><tr><th>{t.code}</th><th>{t.typeOperation}</th><th>{t.regime}</th><th>{t.tva}</th><th>{t.parafiscal}</th><th>{t.timbre}</th><th>{t.periode}</th><th>{t.auteurMotif}</th><th>{libelles.administration.actions}</th></tr></thead>
        <tbody>{donnees.profils.map((p) => <tr key={p.id}>
          <td>{p.code}{p.en_vigueur && <> <Pastille ton="ok">{t.enVigueur}</Pastille></>}</td>
          <td>{t.types[p.type_operation]}</td>
          <td>{libelles.clients.regimes[p.regime_tva_client]}</td>
          <td className="nombre">{ppmEnPourcent(p.taux_tva_ppm)} %</td>
          <td className="nombre">{ppmEnPourcent(p.taux_parafiscal_ppm)} %{p.parafiscal_dans_base_tva ? ` ${t.dansBaseCourt}` : ''}</td>
          <td className="nombre">{millimesEnDinars(p.timbre_millimes)}</td>
          <td>{formaterHorodatage(p.valide_du)}{p.valide_au !== null && ` → ${formaterHorodatage(p.valide_au)}`}</td>
          <td>{p.auteur} : {p.motif}</td>
          <td>{p.valide_au === null && saisie === null && <button type="button" className="bouton-secondaire" onClick={() => ouvrir(saisieDe(p))}>{t.nouvelleVersionCourt}</button>}</td>
        </tr>)}</tbody>
      </table></div></Panneau>}
    </div>
  </section>
}
