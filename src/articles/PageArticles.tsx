import { useState } from 'react'
import { useLecture } from '../api/useLecture'
import { useSoumission } from '../api/useSoumission'
import { Champ, ChampChoix } from '../composants/Champ'
import { EnTeteEcran } from '../composants/EnTeteEcran'
import { EtatVide } from '../composants/EtatVide'
import { ListeDetail } from '../composants/ListeDetail'
import { Note } from '../composants/Note'
import { Panneau } from '../composants/Panneau'
import { Pastille } from '../composants/Pastille'
import { TableauDonnees, type Colonne } from '../composants/TableauDonnees'
import { Tiroir } from '../composants/Tiroir'
import { afficherMillimes } from '../format/montants'
import { entierPositif, uniteExacte } from '../format/saisie'
import { libelles } from '../libelles'
import { RepereArticle } from '../administration/reperes'

interface Article {
  id: number; code: string; libelle: string; type_article: 'huile' | 'contenant' | 'service'
  qualite_huile: string | null; prix_unitaire_millimes: number; stock: number; actif: number
}
interface Formulaire {
  code: string; libelle: string; type_article: Article['type_article']
  qualite_huile: string; prix: string; motif: string
}
const vide: Formulaire = { code: '', libelle: '', type_article: 'contenant', qualite_huile: '', prix: '', motif: '' }
const t = libelles.articlesAdmin

export function PageArticles() {
  const liste = useLecture<{ articles: Article[] }>('/api/articles')
  const commande = useSoumission()
  const [selection, choisirSelection] = useState<Article | null>(null)
  const [mode, definirMode] = useState<'creation' | 'modification' | null>(null)
  const [formulaire, saisir] = useState<Formulaire>(vide)
  const [quantite, saisirQuantite] = useState('')
  const [reference, saisirReference] = useState('')
  const [erreur, definirErreur] = useState<string | null>(null)

  const ouvrir = (article: Article | null) => {
    saisir(article === null ? vide : {
      code: article.code, libelle: article.libelle, type_article: article.type_article,
      qualite_huile: article.qualite_huile ?? '', prix: afficherMillimes(article.prix_unitaire_millimes).replace(/\s/g, ''), motif: '',
    })
    definirErreur(null); commande.reinitialiser(); definirMode(article === null ? 'creation' : 'modification')
  }

  const enregistrer = async () => {
    const prix = uniteExacte(formulaire.prix, 3)
    if (prix === null || !formulaire.code.trim() || !formulaire.libelle.trim() ||
      (formulaire.type_article === 'huile' && !formulaire.qualite_huile)) {
      definirErreur(t.erreurArticle); return
    }
    if (mode === 'modification' && selection === null) return
    const reponse = await commande.soumettre<{ article: Article }>(
      mode === 'creation' ? '/api/articles' : `/api/articles/${selection?.id}/modification`,
      {
        code: formulaire.code.trim(), libelle: formulaire.libelle.trim(), type_article: formulaire.type_article,
        qualite_huile: formulaire.type_article === 'huile' ? formulaire.qualite_huile : null,
        prix_unitaire_millimes: prix, ...(formulaire.motif.trim() ? { motif: formulaire.motif.trim() } : {}),
      },
    )
    if (reponse === null) return
    choisirSelection(reponse.article); definirMode(null); commande.reinitialiser(); await liste.recharger()
  }

  const changerActivite = async (article: Article) => {
    const reponse = await commande.soumettre<{ article: Article }>(`/api/articles/${article.id}/${article.actif ? 'desactivation' : 'reactivation'}`, {})
    if (reponse === null) return
    choisirSelection(reponse.article)
    commande.reinitialiser(); await liste.recharger()
  }

  const reassortir = async () => {
    const nombre = entierPositif(quantite)
    if (selection === null || nombre === null || !reference.trim()) { definirErreur(t.erreurReassort); return }
    const reponse = await commande.soumettre<{ article: Article }>(`/api/articles/${selection.id}/reassort`, { quantite: nombre, reference_achat: reference.trim() })
    if (reponse === null) return
    choisirSelection(reponse.article)
    saisirQuantite(''); saisirReference(''); commande.reinitialiser(); await liste.recharger()
  }

  const colonnes: Colonne<Article>[] = [
    { cle: 'code', titre: t.code, rendu: (a) => a.code },
    { cle: 'libelle', titre: t.libelle, rendu: (a) => <span className="admin-identite"><RepereArticle type={a.type_article} /><span>{a.libelle}</span></span> },
    { cle: 'prix', titre: t.prix, nombre: true, rendu: (a) => `${afficherMillimes(a.prix_unitaire_millimes)} DT` },
    { cle: 'etat', titre: t.etat, rendu: (a) => <Pastille ton={a.actif ? 'ok' : 'neutre'}>{a.actif ? t.actif : t.inactif}</Pastille> },
  ]

  return <section>
    <EnTeteEcran titre={t.titre} principal={mode === null ? { etiquette: t.nouveau, surClic: () => ouvrir(null) } : null} />
    <div className="mes-page">
      <ListeDetail liste={<Panneau titre={t.catalogue} icone="package" serre>
        <TableauDonnees legende={t.catalogue} colonnes={colonnes} lignes={liste.donnees?.articles ?? null}
          cleLigne={(a) => a.id} vide={t.aucun} erreur={liste.erreur} surChoisir={choisirSelection} choisie={selection?.id} />
      </Panneau>} detail={selection === null ? <Panneau titre={t.detail}><EtatVide message={t.choisir} /></Panneau> :
        <Panneau titre={`${selection.code} — ${selection.libelle}`}>
          {erreur && <Note ton="erreur">{erreur}</Note>}
          {commande.erreur && <Note ton="erreur">{commande.erreur}</Note>}
          <p>{selection.type_article === 'huile' ? selection.qualite_huile : selection.type_article} · {afficherMillimes(selection.prix_unitaire_millimes)} DT {selection.type_article === 'huile' ? t.parKg : t.parPiece}</p>
          {selection.type_article === 'contenant' && <p>{t.stock} : {selection.stock}</p>}
          <div className="actions-ligne">
            <button type="button" className="bouton-secondaire" onClick={() => ouvrir(selection)}>{t.modifier}</button>
            <button type="button" className="bouton-secondaire" onClick={() => void changerActivite(selection)}>{selection.actif ? t.desactiver : t.reactiver}</button>
          </div>
          {selection.type_article === 'contenant' && <section className="sous-section" aria-label={t.reassort}>
            <h3>{t.reassort}</h3>
            <Champ id="quantite-reassort" libelle={t.quantite} inputMode="numeric" valeur={quantite} surChangement={saisirQuantite} />
            <Champ id="reference-reassort" libelle={t.reference} valeur={reference} surChangement={saisirReference} />
            <button type="button" className="bouton-secondaire" disabled={commande.enCours} onClick={() => void reassortir()}>{t.enregistrerReassort}</button>
          </section>}
        </Panneau>} />
    </div>
    {mode !== null && <Tiroir titre={mode === 'creation' ? t.nouveau : `${t.modifier} ${selection?.code ?? ''}`}
      etiquette={t.enregistrer} enCours={commande.enCours} erreur={erreur ?? commande.erreur}
      surValider={() => void enregistrer()} surFermer={() => definirMode(null)}>
      <Champ id="code-article" libelle={t.code} valeur={formulaire.code} surChangement={(v) => saisir({ ...formulaire, code: v })} />
      <Champ id="libelle-article" libelle={t.libelle} valeur={formulaire.libelle} surChangement={(v) => saisir({ ...formulaire, libelle: v })} />
      <ChampChoix id="type-article" libelle={t.type} valeur={formulaire.type_article} surChangement={(v) => saisir({ ...formulaire, type_article: v as Article['type_article'] })}
        options={[{ valeur: 'contenant', libelle: t.contenant }, { valeur: 'huile', libelle: t.huile }, { valeur: 'service', libelle: t.service }]} />
      {formulaire.type_article === 'huile' && <ChampChoix id="qualite-article" libelle={t.qualite} valeur={formulaire.qualite_huile} surChangement={(v) => saisir({ ...formulaire, qualite_huile: v })}
        choixVide={t.choisirQualite} options={[{ valeur: 'extra_vierge', libelle: t.extraVierge }, { valeur: 'vierge', libelle: t.vierge }]} />}
      <Champ id="prix-article" libelle={`${t.prix} ${formulaire.type_article === 'huile' ? t.parKg : t.parPiece} (DT)`}
        inputMode="decimal" valeur={formulaire.prix} surChangement={(v) => saisir({ ...formulaire, prix: v })} />
      {mode === 'modification' && <Champ id="motif-article" libelle={t.motif} valeur={formulaire.motif} surChangement={(v) => saisir({ ...formulaire, motif: v })} />}
    </Tiroir>}
  </section>
}
