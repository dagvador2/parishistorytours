/**
 * UI copy of the audioguide, EN + FR. The first block is the `T` object of
 * the design prototype, ported verbatim; the second block covers what the
 * prototype did not have (loading, offline, narration language notice).
 */
import type { Lang } from "../../data/self-guided/left-bank-ww2";

const T = {
  en: {
    selfGuided: "Self-guided", stops: "stops", next: "Next", stop: "Stop", inter: "Interstop", start: "Start",
    gpsOff: "Location is off — tap a pin to start its audio.", enable: "Enable", imHere: "I’m here",
    headTo: "Head to", about: "about", minWalk: "minutes walk", arrivedEyebrow: "You’ve arrived",
    arrivedAt: "You’ve arrived at", playAudio: "Play audio", nowPlaying: "Now playing", left: "left",
    end: "End of tour", completeEyebrow: "Tour complete", completeTitle: "Merci — and well walked.",
    completeBody: "From Boulevard Saint-Michel to Notre-Dame, 1940 to 1944. If the walk meant something to you, a review helps other travellers find it.",
    recapTime: "Duration", recapDist: "Walked", recapStops: "Stops", ctaReview: "Leave a Google review",
    ctaTours: "Discover my in-person tours", restart: "Restart tour", language: "Language",
    pdf: "Download PDF map", support: "Contact Clément", location: "Location", on: "On", off: "Off",
    tapPin: "Tap a pin to start", min: "min",
    // additions
    of: "of",
    lookAround: "No photo for this passage — look around you.",
    loading: "Loading your tour…",
    loadError: "Could not load the tour. Check your connection and try again.",
    retry: "Try again",
    narration: "Narration",
    narrationFallback: "Narration in French for now",
    narrationFallbackLong: "The English narration is being recorded. Audio and subtitles are in French for now.",
    offlinePreparing: "Preparing offline mode…",
    offlineAudio: "audio files",
    offlineReady: "Ready for offline use ✓",
    offlineFailed: "Offline mode unavailable — keep an internet connection.",
    offlineNotSupported: "Offline mode needs a recent browser.",
    restartConfirm: "Restart the tour from the beginning? Your progress will be lost.",
    resume: "Resume",
    mapAttribution: "Map data © OpenStreetMap contributors",
    locationSettings: "Location is blocked for this site. Enable it in your browser or phone settings, then reload.",
    hour: "h",
    accessErrorTitle: "This link does not open the tour",
    accessNoToken: "Open the tour from the link in your purchase email — it carries your personal access.",
    accessInvalid: "This access link is not valid. Check the link in your purchase email, or contact Clément.",
    productPage: "About the self-guided tour",
    accessExpiredTitle: "This access has expired",
    accessExpiredBody: "Your link was valid for a few days after purchase. If you did not get to walk the tour, write to me and I will reopen it.",
    buyAgain: "See the self-guided tour",
    accessLeft: "Access",
    accessDays: "{days} days left",
    accessLastDay: "last day",
  },
  fr: {
    selfGuided: "Visite libre", stops: "étapes", next: "Suivant", stop: "Étape", inter: "Interstop", start: "Départ",
    gpsOff: "Position désactivée — touchez un repère pour lancer l’audio.", enable: "Activer", imHere: "J’y suis",
    headTo: "Direction", about: "environ", minWalk: "min à pied", arrivedEyebrow: "Vous êtes arrivé",
    arrivedAt: "Vous êtes arrivé à", playAudio: "Écouter l’audio", nowPlaying: "En cours", left: "restantes",
    end: "Fin de la visite", completeEyebrow: "Visite terminée", completeTitle: "Merci — et bien marché.",
    completeBody: "Du boulevard Saint-Michel à Notre-Dame, de 1940 à 1944. Si cette balade vous a touché, un avis aide d’autres voyageurs à la découvrir.",
    recapTime: "Durée", recapDist: "Parcouru", recapStops: "Étapes", ctaReview: "Laisser un avis Google",
    ctaTours: "Découvrir mes visites guidées", restart: "Recommencer", language: "Langue",
    pdf: "Télécharger le plan PDF", support: "Contacter Clément", location: "Position", on: "Activée", off: "Désactivée",
    tapPin: "Touchez un repère", min: "min",
    // additions
    of: "sur",
    lookAround: "Pas de photo pour ce passage — regardez autour de vous.",
    loading: "Chargement de votre visite…",
    loadError: "Impossible de charger la visite. Vérifiez votre connexion et réessayez.",
    retry: "Réessayer",
    narration: "Narration",
    narrationFallback: "Narration en anglais pour l’instant",
    narrationFallbackLong: "La narration française arrive. Audio et sous-titres sont en anglais pour l’instant.",
    offlinePreparing: "Préparation du mode hors ligne…",
    offlineAudio: "fichiers audio",
    offlineReady: "Prêt pour le hors ligne ✓",
    offlineFailed: "Mode hors ligne indisponible — gardez une connexion internet.",
    offlineNotSupported: "Le mode hors ligne demande un navigateur récent.",
    restartConfirm: "Recommencer la visite depuis le début ? Votre progression sera perdue.",
    resume: "Reprendre",
    mapAttribution: "Données cartographiques © contributeurs OpenStreetMap",
    locationSettings: "La position est bloquée pour ce site. Activez-la dans les réglages du navigateur ou du téléphone, puis rechargez.",
    hour: "h",
    accessErrorTitle: "Ce lien n’ouvre pas la visite",
    accessNoToken: "Ouvrez la visite depuis le lien de votre email d’achat : il contient votre accès personnel.",
    accessInvalid: "Ce lien d’accès n’est pas valide. Vérifiez le lien de votre email d’achat, ou contactez Clément.",
    productPage: "À propos de la visite libre",
    accessExpiredTitle: "Cet accès a expiré",
    accessExpiredBody: "Votre lien était valable quelques jours après l’achat. Si vous n’avez pas pu faire la visite, écrivez-moi et je le rouvre.",
    buyAgain: "Voir la visite libre",
    accessLeft: "Accès",
    accessDays: "encore {days} jours",
    accessLastDay: "dernier jour",
  },
} as const;

export type Strings = (typeof T)["en"];

export function strings(lang: Lang): Strings {
  return T[lang] as Strings;
}
