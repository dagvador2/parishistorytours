/**
 * One-off: rebuild config/media-cues.fr.json against the rewritten FR scripts.
 * Each spec names the section, the 0-based paragraph and a substring of the
 * target sentence; the anchor's `startsWith` is derived from the sentence the
 * pipeline itself will see, so what is written here always resolves.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { splitParagraphs, splitSentences } from "../lib/text.ts";
import { PATHS, SECTIONS, scriptPath } from "../lib/sections.ts";

interface Spec {
  sec: string;
  para: number;
  /** substring of the target sentence */
  find: string;
  img: string;
  cap: string;
  /** seconds from that sentence's own start; lets a run of photos change every few seconds */
  off?: number;
  /** CSS object-position when the well's centre crop cuts the subject */
  pos?: string;
  /** turns the cue into the live route map (see lib/cues.ts) */
  route?: { stop: string; find: string; offset?: number; img?: string; cap?: string }[];
  /** turns the cue into the live May 1940 map (see lib/cues.ts) */
  offensive?: { move: string; find: string; offset?: number; img?: string }[];
  /** turns the cue into the live 1944 map — Normandy, Paris, Berlin (see lib/cues.ts) */
  strategic?: { move: string; find: string; offset?: number; img?: string }[];
}

const SPECS: Spec[] = [
  // 01 — intro
  { sec: "01-intro", para: 0, find: "Bienvenue sur le tour", img: "g01_guide_intro", off: -99,
    cap: "Clément au soixante boulevard Saint-Michel, devant les plaques et le mur criblé d'impacts." },
  { sec: "01-intro", para: 2, find: "Voilà comment ça fonctionne", img: "map_base",
    cap: "Le parcours — chaque lieu s'allume au moment où il est nommé.",
    route: [
      { stop: "02-context-of-war", find: "on va commencer au", img: "n01_mur_saint_michel" },
      { stop: "03-fall-of-paris", find: "pour arriver au palais du luxembourg", img: "n05_palais_luxembourg" },
      { stop: "04-odeon", find: "nous irons au théâtre de l'odéon", img: "n09_plaque_guierre" },
      { stop: "05-resistance", find: "au croisement de la rue monsieur", img: "n27_rue_monsieur_le_prince" },
      // named in one breath: their dots light, without a medallion each
      { stop: "06-sorbonne-facade", find: "ensuite trois courts arrêts" },
      { stop: "07-observatory", find: "ensuite trois courts arrêts", offset: 0.7 },
      { stop: "08-saint-severin", find: "ensuite trois courts arrêts", offset: 1.4 },
      { stop: "09-liberation", find: "pour enfin terminer à notre", img: "n47_notre_dame" },
    ] },
  { sec: "01-intro", para: 4, find: "Cette version autoguidée couvre l'arc historique", img: "g08_guide_physique",
    cap: "Le tour en personne, devant Notre-Dame — les petites histoires que je garde pour la visite guidée." },

  // 02 — context of war
  // The wall is what the narration asks the visitor to look at, so it holds
  // alone until the Panthéon is named — no group shot in between.
  { sec: "02-context-of-war", para: 0, find: "Bienvenue au premier arrêt", img: "n01_mur_saint_michel", off: -99,
    cap: "Le soixante boulevard Saint-Michel — la façade de l'École des mines, criblée d'impacts depuis août 1944." },
  { sec: "02-context-of-war", para: 2, find: "se trouve le Panthéon", img: "n02_pantheon",
    cap: "Le Panthéon, à quelques centaines de mètres derrière vous." },
  // +4.2 s: the moment his name is said, inside that same sentence.
  { sec: "02-context-of-war", para: 2, find: "se trouve le Panthéon", img: "n53_jean_moulin", off: 4.2, pos: "50% 20%",
    cap: "Jean Moulin — la figure la plus importante de la Résistance française, au Panthéon depuis 1964." },
  // Stop 1 lists four main stops on its own rhythm: it gets its own map
  // animation rather than the intro's eight-point one.
  { sec: "02-context-of-war", para: 3, find: "voici comment va se dérouler le tour", img: "map_base",
    cap: "Le parcours — les quatre arrêts principaux, dans l'ordre annoncé.",
    route: [
      { stop: "02-context-of-war", find: "ce premier arrêt ici", img: "n01_mur_saint_michel" },
      { stop: "03-fall-of-paris", find: "couvrira la chute de paris", img: "n05_palais_luxembourg" },
      { stop: "05-resistance", find: "du premier réseau de résistance", img: "n27_rue_monsieur_le_prince" },
      { stop: "09-liberation", find: "on terminera à notre", img: "n47_notre_dame" },
    ] },
  { sec: "02-context-of-war", para: 5, find: "Les Allemands signent l'armistice", img: "p05_0",
    cap: "Le wagon en forêt de Compiègne où l'armistice de 1918 a été signé." },
  { sec: "02-context-of-war", para: 5, find: "L'année suivante, ils sont forcés de signer", img: "n16_traite_versailles",
    cap: "La galerie des Glaces de Versailles le 28 juin 1919, jour de la signature du traité." },
  { sec: "02-context-of-war", para: 6, find: "Le traité a frappé l'Allemagne sur trois fronts", img: "n54_versailles_le_matin",
    cap: "« La paix est conclue » — Le Matin du 29 juin 1919, au lendemain de la signature." },
  { sec: "02-context-of-war", para: 7, find: "Le krach de mille neuf cent vingt-neuf", img: "n55_krach_1929",
    cap: "Le parquet de la Bourse pendant le krach de 1929." },
  { sec: "02-context-of-war", para: 7, find: "Et Hitler a pris le pouvoir", img: "n04_hitler_1933",
    cap: "Berlin, 1er mai 1933 — Hitler debout dans sa voiture devant la foule, quelques mois après son arrivée au pouvoir." },
  // The paragraph stays on Chamberlain a good fifteen seconds: three portraits
  // follow one another instead of one still held throughout.
  { sec: "02-context-of-war", para: 8, find: "La figure centrale, c'est le Premier ministre", img: "p06_1", pos: "50% 22%",
    cap: "Neville Chamberlain — Premier ministre britannique, figure de l'apaisement d'avant-guerre." },
  { sec: "02-context-of-war", para: 8, find: "Il voulait préserver la paix", img: "n56_chamberlain_chapeau", pos: "50% 10%",
    cap: "Chamberlain — préserver la paix à presque n'importe quel prix." },
  { sec: "02-context-of-war", para: 8, find: "À chaque fois qu'Hitler enfreignait une clause", img: "n57_chamberlain_portrait", pos: "50% 0%",
    cap: "« On ne va pas entrer en guerre pour ça. » — l'apaisement, clause après clause." },
  { sec: "02-context-of-war", para: 9, find: "a culminé avec les Accords de Munich", img: "p07_2",
    cap: "Hitler et Chamberlain à Munich, septembre 1938." },
  { sec: "02-context-of-war", para: 9, find: "Chamberlain rentre chez lui en brandissant", img: "p07_3",
    cap: "« J'ai dans ma main un papier... » Chamberlain rentre de Munich, l'accord à la main." },
  { sec: "02-context-of-war", para: 9, find: "Six mois plus tard, Hitler enfreint ce traité", img: "n58_invasion_tchecoslovaquie",
    cap: "Les troupes allemandes entrent en Tchécoslovaquie, mars 1939 — six mois après Munich." },
  { sec: "02-context-of-war", para: 10, find: "quand Hitler envahit la Pologne quand même", img: "p08_4",
    cap: "Les troupes allemandes franchissent la frontière polonaise, 1er septembre 1939." },
  // Same sentence, second half: the declaration of war two days later.
  { sec: "02-context-of-war", para: 10, find: "quand Hitler envahit la Pologne quand même", img: "n59_invasion_pologne_2", off: 4.7,
    cap: "Les blindés allemands en Pologne — la France et le Royaume-Uni déclarent la guerre le 3 septembre." },
  { sec: "02-context-of-war", para: 11, find: "vous venez d'écouter vingt ans d'histoire", img: "g10_guide_boulevard", pos: "50% 15%",
    cap: "Vingt ans d'histoire en quelques minutes — Clément au premier arrêt du tour en personne." },

  // 03 — fall of Paris
  { sec: "03-fall-of-paris", para: 0, find: "devant le Palais du Luxembourg", img: "n05_palais_luxembourg", off: -99,
    cap: "Le Palais du Luxembourg, siège du Sénat, vu depuis la terrasse du jardin." },
  // Reynaud is named in the second sentence of the stop; he comes back at the
  // speech itself, twelve paragraphs later.
  { sec: "03-fall-of-paris", para: 1, find: "que le Premier ministre Paul Reynaud", img: "p10_5", off: 4.1,
    cap: "Paul Reynaud — c'est son discours du 21 mai 1940, ici même, qui a dit la vérité au Sénat." },
  { sec: "03-fall-of-paris", para: 2, find: "plantons le décor", img: "n05_palais_luxembourg",
    cap: "Le Palais du Luxembourg — gardez-le devant vous, on remonte cinq ans en arrière." },
  { sec: "03-fall-of-paris", para: 3, find: "Les théâtres, les cinémas", img: "n60_theatre_odeon",
    cap: "Le Théâtre de l'Odéon — théâtres, cinémas et music-halls ferment le 3 septembre 1939." },
  { sec: "03-fall-of-paris", para: 3, find: "Des sacs de sable sont apparus", img: "n15_notre_dame_1939",
    cap: "Notre-Dame protégée par des sacs de sable, 1939 — Paris se prépare aux bombardements." },
  { sec: "03-fall-of-paris", para: 4, find: "La Pologne est écrasée en à peine deux mois", img: "n19_pologne_chars",
    cap: "Les blindés allemands et l'infanterie en Pologne, septembre 1939." },
  { sec: "03-fall-of-paris", para: 4, find: "Mais sur le front ouest", img: "n61_ligne_maginot",
    cap: "Un ouvrage de la ligne Maginot — c'est derrière elle que la France attend une attaque qui ne vient pas." },
  { sec: "03-fall-of-paris", para: 4, find: "La vie à Paris est doucement revenue", img: "n62_brasserie_dome",
    cap: "Une terrasse de Montparnasse — cinémas, théâtres et restaurants ont rouvert." },
  { sec: "03-fall-of-paris", para: 4, find: "Les Français ont appelé cette période", img: "n20_drole_de_guerre",
    cap: "La drôle de guerre — distribution de la soupe dans un ouvrage de la ligne Maginot, hiver 1939-1940." },
  { sec: "03-fall-of-paris", para: 5, find: "Mais au cours de cette drôle de guerre", img: "p10_5",
    cap: "Paul Reynaud, Premier ministre de France à partir de mars 1940." },
  // One photo for the whole paragraph on rationing: the queue that used to
  // follow it is an Occupation scene, two years too late here.
  { sec: "03-fall-of-paris", para: 6, find: "les restrictions alimentaires commencent", img: "n21_boulangerie_1940",
    cap: "Une boulangerie parisienne de l'époque — à partir du 1er avril 1940, les pains spéciaux sont interdits." },
  { sec: "03-fall-of-paris", para: 7, find: "Et le dix mai mille neuf cent quarante", img: "n63_attaque_10_mai",
    cap: "La colonne allemande en marche, 10 mai 1940 — le chronomètre des trente-cinq jours démarre." },
  // The offensive is one continuous map from here to the newspapers: every
  // arrow is drawn at the second it is spoken and then stays. It used to be
  // four pre-rendered loops, which restarted from nothing at each step, ran on
  // their own clock and carried on through a pause.
  { sec: "03-fall-of-paris", para: 8, find: "Phase un : les Allemands attaquent", img: "map_1940",
    cap: "Les trente-cinq jours de mai 1940 — chaque flèche part au moment où elle est racontée.",
    offensive: [
      { move: "nl", find: "les allemands attaquent en belgique" },
      { move: "be", find: "les allemands attaquent en belgique", offset: 0.5 },
      { move: "gamelin", find: "le général maurice gamelin", img: "p11_7" },
      { move: "fr_n", find: "vers le nord pour les arrêter" },
      { move: "gamelin_out", find: "les allemands attaquent plus bas" },
      { move: "ard", find: "les allemands attaquent plus bas", offset: 0.3 },
      { move: "meuse", find: "traversent les ardennes et la rivière" },
      { move: "break", find: "et passent à travers la forêt" },
      { move: "to_paris", find: "la route de paris est ouverte" },
      { move: "call", find: "le ministre de la défense appelle" },
      { move: "quote", find: "tout est perdu" },
      { move: "quote_out", find: "avait parlé un peu vite" },
      { move: "coast", find: "ils foncent d'abord vers la côte" },
    ] },
  { sec: "03-fall-of-paris", para: 12, find: "Les unes de journaux du seize mai", img: "p13_8",
    cap: "Le Petit Parisien, 16 mai 1940." },
  { sec: "03-fall-of-paris", para: 13, find: "revenons au palais devant vous", img: "n05_palais_luxembourg",
    cap: "Le Palais du Luxembourg — c'est ici que Paul Reynaud s'adresse au Sénat le 21 mai 1940." },
  { sec: "03-fall-of-paris", para: 13, find: "Paul Reynaud est venu ici même", img: "p10_5",
    cap: "Paul Reynaud au Sénat, 21 mai 1940 — le discours où il parle ouvertement de déroute." },
  // Arras and Amiens at last: SOURCES.md asked for these two the day the
  // stand-in went in.
  { sec: "03-fall-of-paris", para: 13, find: "les villes d'Arras et d'Amiens", img: "n64_arras_1940",
    cap: "Arras sous le feu, mai 1940 — les habitants quittent la ville." },
  { sec: "03-fall-of-paris", para: 13, find: "les villes d'Arras et d'Amiens", img: "n65_amiens_allemands", off: 4.5,
    cap: "L'arrivée des Allemands à Amiens, mai 1940 — à cent cinquante kilomètres au nord de Paris." },
  { sec: "03-fall-of-paris", para: 14, find: "la coopération entre l'armée française", img: "n66_churchill_1940",
    cap: "Winston Churchill, Premier ministre britannique depuis le 10 mai 1940." },
  // Dunkirk is on screen from the sentence that explains why, not from the
  // one that names it.
  { sec: "03-fall-of-paris", para: 14, find: "Les Britanniques se rendent compte", img: "n07_dunkerque",
    cap: "Les plages de Dunkerque pendant l'évacuation, 26 mai – 3 juin 1940." },
  { sec: "03-fall-of-paris", para: 14, find: "Le résultat, c'est Dunkerque", img: "n67_dunkerque_2",
    cap: "L'embarquement depuis la plage — les hommes rejoignent les navires par petites embarcations." },
  { sec: "03-fall-of-paris", para: 14, find: "Le résultat, c'est Dunkerque", img: "n68_dunkerque_3", off: 6,
    cap: "Dunkerque — trois cent trente mille hommes évacués à travers la Manche en neuf jours." },
  { sec: "03-fall-of-paris", para: 15, find: "Ensuite, début juin, Paris est bombardé", img: "p14_9",
    cap: "Après le bombardement de Paris, 3 juin 1940." },
  { sec: "03-fall-of-paris", para: 16, find: "Et le dix juin, quatre jours avant", img: "n22_mussolini",
    cap: "Mussolini annonce l'entrée en guerre de l'Italie, 10 juin 1940." },
  // The exodus is spoken over four sentences: three photos follow one another
  // instead of a single still held for half a minute.
  { sec: "03-fall-of-paris", para: 16, find: "Et les Parisiens non plus", img: "n08_exode",
    cap: "L'exode de juin 1940 — près de trois Parisiens sur quatre quittent la ville." },
  { sec: "03-fall-of-paris", para: 16, find: "Aucune instruction claire", img: "n23_exode_2",
    cap: "Sur les routes de France, juin 1940 — les réfugiés emportent ce qu'ils peuvent." },
  { sec: "03-fall-of-paris", para: 16, find: "Sur les deux millions huit cent mille", img: "n69_exode_paris",
    cap: "L'exode — une famille quitte la ville avec ce qu'elle peut pousser, juin 1940." },
  { sec: "03-fall-of-paris", para: 17, find: "Les Allemands entrent dans la capitale", img: "n70_entree_allemands",
    cap: "Les Allemands entrent dans Paris au petit matin du 14 juin 1940, vers l'Arc de Triomphe." },
  { sec: "03-fall-of-paris", para: 17, find: "Le drapeau nazi est hissé partout", img: "p15_10",
    cap: "Le drapeau nazi flottant sur l'Arc de Triomphe, juin 1940." },
  { sec: "03-fall-of-paris", para: 17, find: "Au matin du quinze juin", img: "n71_defile_15_juin",
    cap: "Le défilé allemand sur les Champs-Élysées, 15 juin 1940 — montrer au monde que Paris est tombée." },
  { sec: "03-fall-of-paris", para: 18, find: "Hitler fait sa seule et unique visite", img: "p16_11", pos: "33% 58%",
    cap: "Hitler au Trocadéro, 23 juin 1940 — l'image la plus reproduite de sa seule visite à Paris." },
  { sec: "03-fall-of-paris", para: 19, find: "on va vers l'Occupation et la Résistance", img: "g11_guide_marche_sorbonne", pos: "50% 20%",
    cap: "On repart — la suite du tour, vers l'Occupation et la Résistance." },

  // 04 — Odéon
  { sec: "04-odeon", para: 0, find: "Vous êtes maintenant devant le Théâtre", img: "n72_odeon_aujourdhui", off: -99,
    cap: "Le Théâtre de l'Odéon — le bâtiment devant vous." },
  { sec: "04-odeon", para: 0, find: "Ce petit arrêt que nous allons faire", img: "g13_groupe_odeon", pos: "50% 65%",
    cap: "Le même arrêt en visite guidée — au pied du Théâtre de l'Odéon." },
  { sec: "04-odeon", para: 0, find: "une petite plaque commémorative", img: "n09_plaque_guierre",
    cap: "La plaque de Jacques Guierre, rue Corneille, contre le Théâtre de l'Odéon." },
  { sec: "04-odeon", para: 1, find: "Cet acronyme désignait les Forces Françaises", img: "n73_voiture_ffi",
    cap: "Les Forces Françaises de l'Intérieur — un groupe FFI sur sa voiture, Paris, août 1944." },
  // Le paragraphe 2 est une seule phrase de vingt secondes : les deux photos y
  // sont placées à la voix — « et surtout de récolter des renseignements » à
  // +6 s, « pour que les armées françaises » à +9,4 s.
  { sec: "04-odeon", para: 2, find: "Leur rôle pendant l'insurrection", img: "n74_ffi_barricade", off: 6,
    cap: "Des FFI derrière une barricade de barbelés, Paris, août 1944." },
  { sec: "04-odeon", para: 2, find: "Leur rôle pendant l'insurrection", img: "n43_combats_rues", off: 9.4,
    cap: "Des combattants FFI au sol dans une rue de Paris, août 1944." },
  { sec: "04-odeon", para: 3, find: "Ce matin-là, Jacques Guierre", img: "n75_jacques_guierre", pos: "50% 30%",
    cap: "Jacques Guierre — étudiant FFI, tué ici le 25 août 1944, à vingt ans." },
  { sec: "04-odeon", para: 3, find: "Ce matin-là, Jacques Guierre", img: "n76_tanks_luxembourg", off: 5.3,
    cap: "Les blindés allemands retranchés au Jardin du Luxembourg — l'objectif de sa mission." },
  { sec: "04-odeon", para: 4, find: "Très bien, d'ici, continuez la Rue de l'Odéon", img: "g12_guide_odeon",
    cap: "On repart vers la Rue Monsieur-le-Prince — le troisième arrêt." },

  // 05 — resistance
  { sec: "05-resistance", para: 0, find: "Bienvenue au troisième arrêt", img: "n52_plaque_monsieur_le_prince", off: -99,
    cap: "La plaque de la rue, sixième arrondissement — « de l'ancien hôtel des Princes de Condé »." },
  { sec: "05-resistance", para: 1, find: "Rien ici ne marque l'endroit", img: "n27_rue_monsieur_le_prince",
    cap: "La Rue Monsieur-le-Prince aujourd'hui — une rue ordinaire, et c'est en partie le sujet." },
  { sec: "05-resistance", para: 3, find: "Elle s'appelait Agnès Humbert", img: "n10_agnes_humbert", pos: "50% 22%",
    cap: "Agnès Humbert — historienne de l'art, cofondatrice du réseau du Musée de l'Homme." },
  { sec: "05-resistance", para: 4, find: "la France est divisée en deux", img: "p17_13",
    cap: "La France divisée après l'armistice : zone occupée, zone « libre » sous Vichy, et l'Alsace-Moselle annexée." },
  { sec: "05-resistance", para: 4, find: "Le personnel des grands musées parisiens", img: "p20_14",
    cap: "Le Musée de l'Homme au Trocadéro — le musée qui a donné son nom au réseau." },
  // What had changed in Paris: three photos in a row, as it is spoken.
  { sec: "05-resistance", para: 5, find: "Très vite, elle remarque ce qui a changé", img: "n28_panneaux_allemands",
    cap: "Les panneaux allemands plantés dans Paris — « Kommandant von Gross-Paris »." },
  { sec: "05-resistance", para: 5, find: "Les musées sont gratuits pour les soldats allemands", img: "n29_soldats_allemands_paris",
    cap: "Des soldats allemands en visite dans Paris, 1940." },
  { sec: "05-resistance", para: 5, find: "L'Occupation s'est infiltrée dans chaque institution", img: "n30_soldats_cafe_paris",
    cap: "Une terrasse parisienne sous l'Occupation — l'occupant est partout, dans le quotidien." },
  { sec: "05-resistance", para: 7, find: "Son allié le plus proche était Jean Cassou", img: "p21_15", pos: "50% 30%",
    cap: "Jean Cassou — écrivain, historien de l'art, cofondateur du réseau du Musée de l'Homme." },
  { sec: "05-resistance", para: 8, find: "Ils se réunissaient chaque semaine", img: "n31_horloge",
    cap: "Une horloge de l'armée allemande — dans leur lieu de réunion, la leur restait à l'heure française." },
  { sec: "05-resistance", para: 9, find: "Ils ont commencé petit", img: "n34_tract_resistance",
    cap: "Un tract clandestin — au début, quelques mots sur un bout de papier." },
  { sec: "05-resistance", para: 10, find: "publie le premier numéro de son journal", img: "n39_journal_resistance",
    cap: "Le premier numéro de Résistance, 15 décembre 1940." },
  { sec: "05-resistance", para: 12, find: "Ce journal, que vous voyez", img: "p22_16", pos: "50% 6%",
    cap: "Quatre pages, sans la moindre image — le journal du réseau du Musée de l'Homme." },
  { sec: "05-resistance", para: 13, find: "la Gestapo est arrivée à Paris", img: "n32_gestapo_paris",
    cap: "La police allemande s'installe à Paris — Carl Oberg, chef de la SS et de la police en France, aux côtés de Pierre Laval." },
  { sec: "05-resistance", para: 14, find: "ils intégrèrent Albert Gaveau", img: "n50_albert_gaveau",
    cap: "Albert Gaveau — entré dans le réseau en février 1941, il travaillait pour la Gestapo." },
  { sec: "05-resistance", para: 15, find: "Les Allemands sont venus la chercher", img: "n10_agnes_humbert", pos: "50% 22%",
    cap: "Agnès Humbert — arrêtée le 13 avril 1941, déportée, condamnée aux travaux forcés." },
  { sec: "05-resistance", para: 16, find: "elle a survécu au camp", img: "p23_17",
    cap: "Notre Guerre — le journal d'Agnès Humbert, publié en 1946." },
  { sec: "05-resistance", para: 19, find: "mettons-nous en route pour notre dernier arrêt", img: "n47_notre_dame",
    cap: "Notre-Dame de Paris — le dernier arrêt du parcours." },

  // 06 — Sorbonne façade
  // La façade entière d'abord : on arrive, on situe le bâtiment. La vidéo des
  // impacts ne vient qu'à 5 s, quand la narration demande de regarder la colonne.
  { sec: "06-sorbonne-facade", para: 0, find: "Vous êtes maintenant devant l'entrée principale", img: "n84_sorbonne_facade", off: -99, pos: "50% 35%",
    cap: "La Sorbonne, place de la Sorbonne — la chapelle et l'entrée principale." },
  // −0,6 s sur « Les impacts de balles sont toujours là » (5,62 s) : la vidéo
  // prend la suite de la photo à la cinquième seconde.
  { sec: "06-sorbonne-facade", para: 1, find: "Les impacts de balles sont toujours là", img: "anim_sorbonne_impacts", off: -0.6,
    cap: "Les impacts de balles sur la colonne de droite, à l'entrée de la Sorbonne." },
  { sec: "06-sorbonne-facade", para: 2, find: "Le Quartier latin", img: "g15_groupe_quartier_latin",
    cap: "Une visite dans les rues du Quartier latin, l'un des foyers de combats d'août 1944." },
  { sec: "06-sorbonne-facade", para: 2, find: "Les impacts sur cette colonne", img: "anim_sorbonne_impacts",
    cap: "Les impacts sur cette colonne — un rappel direct de la semaine d'août 1944." },

  // 07 — observatory
  // off: -99 comme toute première image d'un arrêt : la phrase commence à 0,02 s
  // et le puits restait vide le temps d'un battement au lancement.
  { sec: "07-observatory", para: 0, find: "Levez les yeux vers la tour", img: "n11_observatoire", off: -99,
    cap: "La tour de l'observatoire de la Sorbonne, criblée d'impacts des combats d'août 1944." },

  // 08 — Saint-Séverin
  { sec: "08-saint-severin", para: 0, find: "Vous êtes maintenant devant l'Église Saint-Séverin", img: "n49_saint_severin", off: -99,
    cap: "L'église Saint-Séverin, l'une des plus anciennes de la Rive Gauche." },
  { sec: "08-saint-severin", para: 1, find: "Regardez l'image qui s'affiche maintenant", img: "p25_18",
    cap: "Barricade sur la Rue du Petit-Pont, devant Saint-Séverin — août 1944." },
  { sec: "08-saint-severin", para: 2, find: "C'est celle qui s'affiche maintenant", img: "p26_19",
    cap: "La seconde barricade, au 30 rue Saint-Jacques — portraits des dirigeants allemands accrochés dessus." },

  // 09 — liberation
  { sec: "09-liberation", para: 0, find: "Vous êtes face à Notre-Dame", img: "n85_notre_dame_face", off: -99,
    cap: "Notre-Dame de Paris, depuis le quai — vous y êtes." },
  { sec: "09-liberation", para: 1, find: "Mais le bâtiment dont parle vraiment cet arrêt", img: "n12_prefecture",
    cap: "La Préfecture de Police de Paris, île de la Cité — juste en face de Notre-Dame." },
  { sec: "09-liberation", para: 2, find: "La Préfecture de Police est la première place forte", img: "n86_ffi_prefecture_feu",
    cap: "Des FFI au fusil-mitrailleur à une fenêtre de la Préfecture, août 1944." },
  // +6.7 s: the plane arrives on the words "mission aérienne", not before.
  { sec: "09-liberation", para: 2, find: "une mission aérienne spectaculaire", img: "p33_27", off: 6.7,
    cap: "Un Piper Cub — l'avion de la mission du 24 août 1944." },
  { sec: "09-liberation", para: 3, find: "Sur le théâtre global de la guerre", img: "n87_prisonniers_stalingrad",
    cap: "Prisonniers allemands à Stalingrad — sur le front de l'Est, l'avantage a changé de camp." },
  // Normandy, in three frames rather than one — inside their own sentence,
  // which runs about five seconds: the live map takes the screen at the next.
  { sec: "09-liberation", para: 3, find: "débarquement allié en Normandie", img: "n13_debarquement",
    cap: "Le débarquement allié en Normandie, juin 1944." },
  { sec: "09-liberation", para: 3, find: "débarquement allié en Normandie", img: "n35_debarquement_2", off: 1.8,
    cap: "Omaha Beach, 6 juin 1944 — la rampe s'abaisse." },
  { sec: "09-liberation", para: 3, find: "débarquement allié en Normandie", img: "n36_debarquement_3", off: 3.5,
    cap: "Les renforts débarquent sur la plage dans les jours qui suivent." },
  // The strategic picture, drawn live: Normandy, Paris, Berlin, then what a
  // liberated capital costs and the road round it. Holds to the end of the
  // paragraph on logistics — the still it replaces could only say the first half.
  { sec: "09-liberation", para: 3, find: "A partir de là, l'objectif est clair", img: "map_1944",
    cap: "De la Normandie à Berlin — et Paris sur le chemin.",
    strategic: [
      { move: "landed", find: "A partir de là, l'objectif est clair" },
      { move: "berlin", find: "atteindre Berlin et mettre fin" },
      { move: "paris", find: "Mais entre la Normandie et Berlin se trouve Paris" },
      { move: "question", find: "faut-il libérer Paris tout de suite" },
      { move: "question_out", find: "il faudra approvisionner la capitale" },
      // the three costs land on the three words, half a second apart
      { move: "supply_men", find: "ce qui demandera des hommes" },
      { move: "supply_fuel", find: "de l'essence" },
      { move: "supply_food", find: "de la nourriture" },
      { move: "bypass", find: "ils souhaitent contourner Paris" },
    ] },
  { sec: "09-liberation", para: 5, find: "Mais l'insurrection parisienne démarre", img: "n43_combats_rues",
    cap: "L'insurrection parisienne — des combattants au sol dans une rue de la capitale, août 1944." },
  { sec: "09-liberation", para: 6, find: "Côté allemand : le général Dietrich von Choltitz", img: "p28_20", pos: "50% 15%",
    cap: "Le général Dietrich von Choltitz — commandant allemand du « Grand Paris », août 1944." },
  { sec: "09-liberation", para: 7, find: "Côté français", img: "n88_insurrection_drapeau",
    cap: "L'insurrection dans Paris, drapeau français à la main — août 1944." },
  { sec: "09-liberation", para: 7, find: "sous le commandement du colonel Henri", img: "p29_21", pos: "50% 12%",
    cap: "Le colonel Henri Rol-Tanguy — chef régional communiste des FFI, qui va imposer l'insurrection." },
  { sec: "09-liberation", para: 7, find: "Et de l'autre côté les gaullistes", img: "n37_de_gaulle", pos: "50% 0%",
    cap: "Le général Charles de Gaulle — chef de la France libre." },
  // +4 s: Leclerc appears as his name is said, at the end of that long sentence.
  { sec: "09-liberation", para: 7, find: "Ils contrôlaient l'essentiel des forces de police", img: "p29_22", off: 4,
    cap: "Le général Philippe Leclerc — commandant de la 2e Division Blindée française." },
  { sec: "09-liberation", para: 8, find: "L'insurrection était nécessaire", img: "n74_ffi_barricade",
    cap: "Des FFI derrière une barricade parisienne — l'insurrection que les deux camps voulaient." },
  // The two camps alternate on screen while the narration weighs them up.
  { sec: "09-liberation", para: 8, find: "Les gaullistes voulaient retarder l'insurrection", img: "n37_de_gaulle", pos: "50% 0%",
    cap: "Les gaullistes veulent attendre les Alliés — de Gaulle jouera son entrée." },
  { sec: "09-liberation", para: 8, find: "De leur côté les communistes dirigés par Rol tanguy", img: "p29_21", pos: "50% 12%",
    cap: "Rol-Tanguy veut lancer l'insurrection tout de suite, sans les Américains." },
  { sec: "09-liberation", para: 8, find: "Elle démarre le dix-neuf août", img: "p30_23",
    cap: "L'appel à l'insurrection placardé sur les murs de Paris, août 1944." },
  { sec: "09-liberation", para: 8, find: "Les deux mille policiers parisiens", img: "n42_prefecture_ffi",
    cap: "Le portail de la Préfecture de Police, la première place forte saisie par la Résistance." },
  // +4.1 s: the same sentence, at the moment the firing starts.
  { sec: "09-liberation", para: 8, find: "Les deux mille policiers parisiens", img: "n86_ffi_prefecture_feu", off: 4.1,
    cap: "Les policiers tirent depuis les fenêtres de la Préfecture sur tout véhicule allemand qui passe." },
  { sec: "09-liberation", para: 9, find: "À quinze heures trente", img: "n14_panther_paris",
    cap: "Un Panther dans Paris, devant l'Arc de Triomphe — le type de char envoyé sur le parvis." },
  { sec: "09-liberation", para: 10, find: "Son plan : une frappe aérienne de la Luftwaffe", img: "n38_luftwaffe",
    cap: "Un bombardier allemand Heinkel He 111 au-dessus de Paris." },
  { sec: "09-liberation", para: 11, find: "Une trêve entre français et allemands", img: "n90_voiture_treve",
    cap: "Une voiture à haut-parleur annonce la trêve dans les rues de Paris, août 1944." },
  { sec: "09-liberation", para: 12, find: "Rol-Tanguy, ce jour-là", img: "p29_21", pos: "50% 12%",
    cap: "Rol-Tanguy — « Paris libre vaut bien deux cent mille morts. »" },
  { sec: "09-liberation", para: 12, find: "Les combats reprennent le vingt-deux août", img: "p25_18",
    cap: "Une barricade rue du Petit-Pont, devant Saint-Séverin — elles s'élèvent partout à partir du 22 août." },
  { sec: "09-liberation", para: 13, find: "Eisenhower et Bradley", img: "n91_eisenhower_bradley_portraits",
    cap: "Eisenhower et Bradley, à qui revient la décision de foncer sur Paris." },
  { sec: "09-liberation", para: 13, find: "La deuxième Division Blindée française", img: "p29_22",
    cap: "Le général Leclerc met le cap sur Paris avec la 2e Division Blindée." },
  { sec: "09-liberation", para: 14, find: "Von Choltitz reçoit un ordre direct", img: "p28_20", pos: "50% 15%",
    cap: "L'ordre d'Hitler à Von Choltitz : les Alliés ne devront trouver que des ruines." },
  { sec: "09-liberation", para: 14, find: "Partout dans la ville", img: "n92_luxembourg_senat_tank",
    cap: "Le Palais du Luxembourg, siège du Sénat — comme les ponts et les grands bâtiments de Paris, il était piégé, prêt à sauter." },
  { sec: "09-liberation", para: 15, find: "Au matin du vingt-quatre août", img: "n89_ffi_prefecture_cour",
    cap: "Les hommes retranchés dans la cour de la Préfecture — presque à court de munitions." },
  { sec: "09-liberation", para: 15, find: "Ils appelaient désespérément", img: "n86_ffi_prefecture_feu",
    cap: "Aux fenêtres, on tient la position en attendant les Alliés." },
  { sec: "09-liberation", para: 15, find: "Les armées alliées étaient si proches", img: "n93_2edb_route_paris",
    cap: "La 2e Division Blindée en route vers Paris — si proche, et pourtant si loin." },
  { sec: "09-liberation", para: 17, find: "Dans l'après-midi du vingt-quatre août", img: "p29_22",
    cap: "Le général Leclerc — c'est lui qui décide de lancer la mission aérienne." },
  { sec: "09-liberation", para: 18, find: "Le capitaine Jean Callet était aux commandes", img: "n18_callet_mantoux",
    cap: "L'équipage de la mission : le capitaine Jean Callet et le lieutenant Étienne Mantoux." },
  { sec: "09-liberation", para: 18, find: "Ils décollent vers dix-sept heures", img: "p33_27",
    cap: "Un Piper Cub — l'avion de reconnaissance léger utilisé pour la mission." },
  { sec: "09-liberation", para: 18, find: "le but est de suivre la Seine", img: "p34_28",
    cap: "Le trajet de la mission — au-dessus de Paris, jusqu'à la Préfecture, et retour." },
  { sec: "09-liberation", para: 18, find: "A l'approche du bâtiment", img: "n94_prefecture_vue_haut",
    cap: "La Préfecture de Police vue d'en haut — la cour visée depuis l'avion." },
  // On the sentence that reads the note aloud, not on the one after it, and it
  // holds until the plane is back: it is what the whole story is about.
  { sec: "09-liberation", para: 18, find: "Sur ce message signé par le général Leclerc", img: "p35_29",
    cap: "Le message largué dans la cour : « Le Général Leclerc vous fait dire : Tenez bon, nous arrivons. »" },
  { sec: "09-liberation", para: 19, find: "Malgré treize impacts", img: "p36_30", pos: "50% 0%",
    cap: "Le rapport officiel de la mission, rédigé après le retour des pilotes." },
  { sec: "09-liberation", para: 19, find: "Les policiers de la préfecture", img: "n89_ffi_prefecture_cour",
    cap: "Les policiers de la Préfecture tiendront le bâtiment jusqu'à l'arrivée des Alliés." },
  { sec: "09-liberation", para: 20, find: "font leur entrée officielle dans Paris", img: "n44_2edb_paris",
    cap: "La 2e Division Blindée dans Paris, 25 août 1944." },
  { sec: "09-liberation", para: 20, find: "Les combats font rage dans tout Paris", img: "n43_combats_rues",
    cap: "Les combats font rage dans toute la ville." },
  { sec: "09-liberation", para: 20, find: "Mais vers quinze heures, Von Choltitz", img: "n46_reddition_choltitz",
    cap: "Von Choltitz fait prisonnier, 25 août 1944." },
  { sec: "09-liberation", para: 20, find: "Et ensuite, un à un, les places fortes", img: "p37_31",
    cap: "Soldats allemands escortés à l'extérieur de l'Hôtel Meurice, QG de Von Choltitz, le 25 août 1944." },
  { sec: "09-liberation", para: 20, find: "Au soir du vingt-cinq août, Paris est libéré", img: "n45_paris_libere",
    cap: "Rue de Rivoli au soir du 25 août — Paris est libéré." },
  { sec: "09-liberation", para: 21, find: "De Gaulle affirmera la victoire", img: "p38_32",
    cap: "Le général de Gaulle descendant les Champs-Élysées, 26 août 1944." },
  // The closing sentence walks back through the whole tour: one image per stage,
  // placed on the words inside that single long sentence.
  { sec: "09-liberation", para: 22, find: "D'un Boulevard Saint-Michel tranquille", img: "g01_guide_intro",
    cap: "Le 60 boulevard Saint-Michel — là où le tour a commencé." },
  { sec: "09-liberation", para: 22, find: "D'un Boulevard Saint-Michel tranquille", img: "n95_hitler_tour_eiffel", off: 2.7,
    cap: "Hitler devant la tour Eiffel, 23 juin 1940 — Paris est tombé en trente-cinq jours." },
  { sec: "09-liberation", para: 22, find: "D'un Boulevard Saint-Michel tranquille", img: "n10_agnes_humbert", off: 5.2,
    cap: "Agnès Humbert — le travail patient des réseaux de résistance." },
  { sec: "09-liberation", para: 22, find: "D'un Boulevard Saint-Michel tranquille", img: "p38_32", off: 8.1,
    cap: "Les Champs-Élysées, 26 août 1944 — la Libération de Paris." },
  { sec: "09-liberation", para: 23, find: "Si vous avez apprécié ce tour", img: "n96_groupe_tour_luxembourg",
    cap: "Un groupe du tour en personne — à refaire avec moi, pour les histoires que je garde pour la visite." },
];


const EN_SPECS: Spec[] = [
  // 01 — intro
  { sec: "01-intro", para: 0, find: "Welcome to the World War Two", img: "g01_guide_intro", off: -99,
    cap: "Clement at sixty Boulevard Saint-Michel, by the memorial plaques and the bullet-scarred wall." },
  { sec: "01-intro", para: 2, find: "Here's how it works", img: "map_base",
    cap: "The route — each place lights up as it is named.",
    route: [
      { stop: "02-context-of-war", find: "we'll start at", img: "n01_mur_saint_michel" },
      { stop: "03-fall-of-paris", find: "to reach the palais du luxembourg", img: "n05_palais_luxembourg" },
      { stop: "04-odeon", find: "head to the théâtre de l'odéon", img: "n09_plaque_guierre" },
      { stop: "05-resistance", find: "to the corner of rue monsieur", img: "n27_rue_monsieur_le_prince" },
      { stop: "06-sorbonne-facade", find: "after that, three short stops" },
      { stop: "07-observatory", find: "after that, three short stops", offset: 0.7 },
      { stop: "08-saint-severin", find: "after that, three short stops", offset: 1.4 },
      { stop: "09-liberation", find: "we'll end at notre", img: "n47_notre_dame" },
    ] },
  { sec: "01-intro", para: 4, find: "This self-guided version covers the full historical arc", img: "g08_guide_physique",
    cap: "The tour in person, in front of Notre-Dame — the small stories I keep for the live walk." },

  // 02 — context of war (kept in step with the FR list above)
  { sec: "02-context-of-war", para: 0, find: "Welcome to the first stop", img: "n01_mur_saint_michel", off: -99,
    cap: "Sixty Boulevard Saint-Michel — the façade of the École des mines, pitted with bullet holes since August 1944." },
  { sec: "02-context-of-war", para: 2, find: "stands the Panthéon", img: "n02_pantheon",
    cap: "The Panthéon, a few hundred metres behind you." },
  { sec: "02-context-of-war", para: 2, find: "stands the Panthéon", img: "n53_jean_moulin", off: 4, pos: "50% 20%",
    cap: "Jean Moulin — the single most important figure of the French Resistance, in the Panthéon since 1964." },
  { sec: "02-context-of-war", para: 3, find: "here's how the tour will go", img: "map_base",
    cap: "The route — the four main stops, in the order they are announced.",
    route: [
      { stop: "02-context-of-war", find: "this first stop here", img: "n01_mur_saint_michel" },
      { stop: "03-fall-of-paris", find: "will cover the fall of paris", img: "n05_palais_luxembourg" },
      { stop: "05-resistance", find: "the first paris resistance network", img: "n27_rue_monsieur_le_prince" },
      { stop: "09-liberation", find: "we'll finish at notre", img: "n47_notre_dame" },
    ] },
  { sec: "02-context-of-war", para: 5, find: "The Germans sign the armistice", img: "p05_0",
    cap: "The carriage in the Compiègne forest where the 1918 armistice was signed." },
  { sec: "02-context-of-war", para: 5, find: "The following year, they're forced to sign", img: "n16_traite_versailles",
    cap: "The Hall of Mirrors at Versailles on 28 June 1919, the day the treaty was signed." },
  { sec: "02-context-of-war", para: 6, find: "The treaty hit Germany on three fronts", img: "n54_versailles_le_matin",
    cap: "\u201CLa paix est conclue\u201D — Le Matin, 29 June 1919, the morning after the signature." },
  { sec: "02-context-of-war", para: 7, find: "The crash of nineteen twenty-nine", img: "n55_krach_1929",
    cap: "The trading floor during the crash of 1929." },
  { sec: "02-context-of-war", para: 7, find: "And Hitler took power", img: "n04_hitler_1933",
    cap: "Berlin, 1 May 1933 — Hitler standing in his car before the crowd, months after taking power." },
  { sec: "02-context-of-war", para: 8, find: "The central figure is the British Prime Minister", img: "p06_1", pos: "50% 22%",
    cap: "Neville Chamberlain — British Prime Minister and the face of pre-war appeasement." },
  { sec: "02-context-of-war", para: 8, find: "He wanted to preserve peace", img: "n56_chamberlain_chapeau", pos: "50% 10%",
    cap: "Chamberlain — peace at almost any price." },
  { sec: "02-context-of-war", para: 8, find: "Every time Hitler broke a clause", img: "n57_chamberlain_portrait", pos: "50% 0%",
    cap: "\u201CWe\u2019re not going to war over that\u201D — appeasement, clause after clause." },
  { sec: "02-context-of-war", para: 9, find: "culminated in the Munich Agreement", img: "p07_2",
    cap: "Hitler and Chamberlain at Munich, September 1938." },
  { sec: "02-context-of-war", para: 9, find: "Chamberlain goes home waving the agreement", img: "p07_3",
    cap: "\u201CI have here a paper\u2026\u201D Chamberlain returns from Munich, the agreement in hand." },
  { sec: "02-context-of-war", para: 9, find: "Six months later, Hitler breaks that treaty", img: "n58_invasion_tchecoslovaquie",
    cap: "German troops entering Czechoslovakia, March 1939 — six months after Munich." },
  { sec: "02-context-of-war", para: 10, find: "when Hitler invades Poland anyway", img: "p08_4",
    cap: "German troops crossing into Poland, 1 September 1939." },
  { sec: "02-context-of-war", para: 10, find: "when Hitler invades Poland anyway", img: "n59_invasion_pologne_2", off: 4.5,
    cap: "German armour in Poland — Britain and France declare war on 3 September." },
  { sec: "02-context-of-war", para: 11, find: "you've just heard twenty years of history", img: "g10_guide_boulevard", pos: "50% 15%",
    cap: "Twenty years of history in a few minutes — Clement at the first stop of the in-person tour." },

  // 03 — fall of Paris
  { sec: "03-fall-of-paris", para: 0, find: "in front of the Palais du Luxembourg", img: "n05_palais_luxembourg", off: -99,
    cap: "The Palais du Luxembourg, home of the Senate, seen from the garden terrace." },
  { sec: "03-fall-of-paris", para: 1, find: "that Prime Minister Paul Reynaud", img: "p10_5", off: 4,
    cap: "Paul Reynaud — his speech of 21 May 1940, in this very building, told the Senate the truth." },
  { sec: "03-fall-of-paris", para: 2, find: "let's set the scene", img: "n05_palais_luxembourg",
    cap: "The Palais du Luxembourg — keep it in front of you; we go back five years." },
  { sec: "03-fall-of-paris", para: 3, find: "The theatres, the cinemas", img: "n60_theatre_odeon",
    cap: "The Théâtre de l'Odéon — theatres, cinemas and music halls closed on 3 September 1939." },
  { sec: "03-fall-of-paris", para: 3, find: "Sandbags appeared around the monuments", img: "n15_notre_dame_1939",
    cap: "Notre-Dame behind sandbags, 1939 — Paris braces for the bombing." },
  { sec: "03-fall-of-paris", para: 4, find: "Poland is crushed in barely two months", img: "n19_pologne_chars",
    cap: "German armour and infantry in Poland, September 1939." },
  { sec: "03-fall-of-paris", para: 4, find: "But on the western front", img: "n61_ligne_maginot",
    cap: "A Maginot Line fort — France waits behind it for an attack that never comes." },
  { sec: "03-fall-of-paris", para: 4, find: "Life in Paris slowly went back to normal", img: "n62_brasserie_dome",
    cap: "A Montparnasse terrace — cinemas, theatres and restaurants had reopened." },
  { sec: "03-fall-of-paris", para: 4, find: "The French called this period", img: "n20_drole_de_guerre",
    cap: "The phoney war — soup served in a Maginot Line fort, winter 1939-40." },
  { sec: "03-fall-of-paris", para: 5, find: "But during that phoney war", img: "p10_5",
    cap: "Paul Reynaud, Prime Minister of France from March 1940." },
  { sec: "03-fall-of-paris", para: 6, find: "food restrictions begin", img: "n21_boulangerie_1940",
    cap: "A Paris bakery of the time — from 1 April 1940, speciality breads were banned." },
  { sec: "03-fall-of-paris", para: 7, find: "And on the tenth of May", img: "n63_attaque_10_mai",
    cap: "The German column on the move, 10 May 1940 — the thirty-five-day countdown starts." },
  // One continuous map, as in FR: see the note on the French spec above.
  { sec: "03-fall-of-paris", para: 8, find: "Phase one: the Germans attack", img: "map_1940",
    cap: "The thirty-five days of May 1940 — each arrow is drawn as it is told.",
    offensive: [
      { move: "nl", find: "the germans attack in belgium" },
      { move: "be", find: "the germans attack in belgium", offset: 0.5 },
      { move: "gamelin", find: "general maurice gamelin", img: "p11_7" },
      { move: "fr_n", find: "men north to stop them" },
      { move: "gamelin_out", find: "the germans attack further south" },
      { move: "ard", find: "the germans attack further south", offset: 0.3 },
      { move: "meuse", find: "cross the ardennes and the river" },
      { move: "break", find: "break through the forest" },
      { move: "to_paris", find: "the road to paris is open" },
      { move: "call", find: "the minister of defence calls paul reynaud" },
      { move: "quote", find: "all is lost" },
      { move: "quote_out", find: "spoken a little too soon" },
      { move: "coast", find: "racing first for the coast" },
    ] },
  { sec: "03-fall-of-paris", para: 12, find: "newspaper front pages of the sixteenth", img: "p13_8",
    cap: "Le Petit Parisien, 16 May 1940." },
  { sec: "03-fall-of-paris", para: 13, find: "back to the palace in front of you", img: "n05_palais_luxembourg",
    cap: "The Palais du Luxembourg — this is where Paul Reynaud addressed the Senate on 21 May 1940." },
  { sec: "03-fall-of-paris", para: 13, find: "Paul Reynaud came here", img: "p10_5",
    cap: "Paul Reynaud at the Senate, 21 May 1940 — the speech where he spoke openly of a rout." },
  { sec: "03-fall-of-paris", para: 13, find: "the cities of Arras and Amiens", img: "n64_arras_1940",
    cap: "Arras under fire, May 1940 — the townspeople leave." },
  { sec: "03-fall-of-paris", para: 13, find: "the cities of Arras and Amiens", img: "n65_amiens_allemands", off: 4.5,
    cap: "The Germans arriving in Amiens, May 1940 — a hundred and fifty kilometres north of Paris." },
  { sec: "03-fall-of-paris", para: 14, find: "cooperation between the French and British armies", img: "n66_churchill_1940",
    cap: "Winston Churchill, British Prime Minister since 10 May 1940." },
  { sec: "03-fall-of-paris", para: 14, find: "The British realise that France might fall", img: "n07_dunkerque",
    cap: "The beaches of Dunkirk during the evacuation, 26 May – 3 June 1940." },
  { sec: "03-fall-of-paris", para: 14, find: "The result is Dunkirk", img: "n67_dunkerque_2",
    cap: "Boarding from the beach — the men reach the ships in small boats." },
  { sec: "03-fall-of-paris", para: 14, find: "The result is Dunkirk", img: "n68_dunkerque_3", off: 6,
    cap: "Dunkirk — three hundred and thirty thousand men taken across the Channel in nine days." },
  { sec: "03-fall-of-paris", para: 15, find: "Then, in early June, Paris is bombed", img: "p14_9",
    cap: "After the bombing of Paris, 3 June 1940." },
  { sec: "03-fall-of-paris", para: 16, find: "And on the tenth of June", img: "n22_mussolini",
    cap: "Mussolini announces Italy's entry into the war, 10 June 1940." },
  { sec: "03-fall-of-paris", para: 16, find: "And neither are the Parisians", img: "n08_exode",
    cap: "The exodus of June 1940 — nearly three Parisians in four left the city." },
  { sec: "03-fall-of-paris", para: 16, find: "No clear instruction had been given", img: "n23_exode_2",
    cap: "On the roads of France, June 1940 — refugees carry what they can." },
  { sec: "03-fall-of-paris", para: 16, find: "Out of two million eight hundred thousand", img: "n69_exode_paris",
    cap: "The exodus — a family leaves town with whatever they can push, June 1940." },
  { sec: "03-fall-of-paris", para: 17, find: "The Germans enter the capital", img: "n70_entree_allemands",
    cap: "The Germans enter Paris in the early hours of 14 June 1940, heading for the Arc de Triomphe." },
  { sec: "03-fall-of-paris", para: 17, find: "The Nazi flag is raised everywhere", img: "p15_10",
    cap: "The Nazi flag flying over the Arc de Triomphe, June 1940." },
  { sec: "03-fall-of-paris", para: 17, find: "On the morning of the fifteenth of June", img: "n71_defile_15_juin",
    cap: "The German parade down the Champs-Élysées, 15 June 1940 — showing the world that Paris had fallen." },
  { sec: "03-fall-of-paris", para: 18, find: "Hitler makes his one and only visit", img: "p16_11", pos: "33% 58%",
    cap: "Hitler at the Trocadéro, 23 June 1940 — the most reproduced image of his only visit to Paris." },
  { sec: "03-fall-of-paris", para: 19, find: "we move on to the Occupation and the Resistance", img: "g11_guide_marche_sorbonne", pos: "50% 20%",
    cap: "On we go — the rest of the tour, into the Occupation and the Resistance." },

  // 04 — Odéon
  { sec: "04-odeon", para: 0, find: "a small commemorative plaque", img: "n09_plaque_guierre",
    cap: "The plaque to Jacques Guierre, Rue Corneille, against the Théâtre de l'Odéon." },
  { sec: "04-odeon", para: 2, find: "Their role during the insurrection", img: "n43_combats_rues",
    cap: "FFI fighters taking cover in a Paris street, August 1944." },

  // 05 — resistance
  { sec: "05-resistance", para: 0, find: "Welcome to the third stop", img: "n52_plaque_monsieur_le_prince", off: -99,
    cap: "The street plate, sixth arrondissement — \u201Cof the former hôtel of the Princes de Condé\u201D." },
  { sec: "05-resistance", para: 1, find: "Nothing here marks the spot", img: "n27_rue_monsieur_le_prince",
    cap: "Rue Monsieur-le-Prince today — an ordinary street, which is half the point." },
  { sec: "05-resistance", para: 3, find: "Her name was Agnès Humbert", img: "n10_agnes_humbert", pos: "50% 22%",
    cap: "Agnès Humbert — art historian, co-founder of the Musée de l'Homme network." },
  { sec: "05-resistance", para: 4, find: "the country is split in two", img: "p17_13",
    cap: "France divided after the armistice: occupied zone, \u201Cfree\u201D zone under Vichy, and the annexed Alsace-Moselle." },
  { sec: "05-resistance", para: 4, find: "the staff of the great Paris museums", img: "p20_14",
    cap: "The Musée de l'Homme at the Trocadéro — the museum that gave the network its name." },
  { sec: "05-resistance", para: 5, find: "Very quickly, she notices what has changed", img: "n28_panneaux_allemands",
    cap: "German signposts planted across Paris — \u201CKommandant von Gross-Paris\u201D." },
  { sec: "05-resistance", para: 5, find: "Museums are free for German soldiers", img: "n29_soldats_allemands_paris",
    cap: "German soldiers sightseeing in Paris, 1940." },
  { sec: "05-resistance", para: 5, find: "The Occupation has worked its way into every institution", img: "n30_soldats_cafe_paris",
    cap: "A Paris café terrace under the Occupation — the occupier is everywhere, in ordinary life." },
  { sec: "05-resistance", para: 7, find: "Her closest ally was Jean Cassou", img: "p21_15", pos: "50% 30%",
    cap: "Jean Cassou — writer, art historian, co-founder of the Musée de l'Homme network." },
  { sec: "05-resistance", para: 8, find: "They met every week", img: "n31_horloge",
    cap: "A German army clock — in their meeting place, theirs stayed on French time." },
  { sec: "05-resistance", para: 9, find: "They started small", img: "n34_tract_resistance",
    cap: "An underground leaflet — at first, a few words on a scrap of paper." },
  { sec: "05-resistance", para: 10, find: "publishes the first issue of its underground", img: "n39_journal_resistance",
    cap: "The first issue of Résistance, 15 December 1940." },
  { sec: "05-resistance", para: 12, find: "That newspaper, the one you can see", img: "p22_16", pos: "50% 6%",
    cap: "Four pages, not a single picture — the newspaper of the Musée de l'Homme network." },
  { sec: "05-resistance", para: 13, find: "the Gestapo arrived in Paris", img: "n32_gestapo_paris",
    cap: "The German police settle into Paris — Carl Oberg, SS and police chief in France, beside Pierre Laval." },
  { sec: "05-resistance", para: 14, find: "they brought Albert Gaveau into the network", img: "n50_albert_gaveau",
    cap: "Albert Gaveau — brought into the network in February 1941, he was working for the Gestapo." },
  { sec: "05-resistance", para: 15, find: "The Germans came for her at the hospital", img: "n10_agnes_humbert", pos: "50% 22%",
    cap: "Agnès Humbert — arrested on 13 April 1941, deported, sentenced to forced labour." },
  { sec: "05-resistance", para: 16, find: "she survived the camp", img: "p23_17",
    cap: "Notre Guerre — Agnès Humbert's diary, published in 1946." },
  { sec: "05-resistance", para: 19, find: "let's set off for our last stop", img: "n47_notre_dame",
    cap: "Notre-Dame de Paris — the last stop of the walk." },

  // 06 — Sorbonne façade
  { sec: "06-sorbonne-facade", para: 0, find: "You're now in front of the Sorbonne's main entrance", img: "anim_sorbonne_impacts", off: -99,
    cap: "The bullet marks on the right-hand column, at the Sorbonne's main entrance." },
  { sec: "06-sorbonne-facade", para: 2, find: "The Latin Quarter", img: "g05_sorbonne_groupe",
    cap: "The Latin Quarter in front of the Sorbonne, one of the pockets of fighting of August 1944." },
  { sec: "06-sorbonne-facade", para: 2, find: "The bullet holes on this column", img: "anim_sorbonne_impacts",
    cap: "The marks on this column — a direct reminder of that week in August 1944." },

  // 07 — observatory
  { sec: "07-observatory", para: 0, find: "Look up at the observatory tower", img: "n11_observatoire", off: -99,
    cap: "The Sorbonne's observatory tower, pitted by the fighting of August 1944." },

  // 08 — Saint-Séverin
  { sec: "08-saint-severin", para: 0, find: "You're now in front of the Church of Saint-Séverin", img: "n49_saint_severin", off: -99,
    cap: "The church of Saint-Séverin, one of the oldest on the Left Bank." },
  { sec: "08-saint-severin", para: 1, find: "Look at the picture on your screen", img: "p25_18",
    cap: "Barricade on Rue du Petit-Pont, in front of Saint-Séverin — August 1944." },
  { sec: "08-saint-severin", para: 2, find: "That's the one on your screen now", img: "p26_19",
    cap: "The second barricade, at 30 Rue Saint-Jacques — portraits of the German leaders hung on it." },

  // 09 — liberation
  { sec: "09-liberation", para: 0, find: "You're facing Notre-Dame", img: "n47_notre_dame", off: -99,
    cap: "Notre-Dame de Paris — you are standing in front of it." },
  { sec: "09-liberation", para: 1, find: "the building this stop is really about", img: "n12_prefecture",
    cap: "The Préfecture de Police de Paris, Île de la Cité — directly opposite Notre-Dame." },
  { sec: "09-liberation", para: 2, find: "a spectacular air mission", img: "p33_27", off: 2,
    cap: "A Piper Cub — the aircraft of the 24 August 1944 mission." },
  { sec: "09-liberation", para: 3, find: "the Allied landings in Normandy", img: "n13_debarquement",
    cap: "The Allied landings in Normandy, June 1944." },
  { sec: "09-liberation", para: 3, find: "the Allied landings in Normandy", img: "n35_debarquement_2", off: 3,
    cap: "Omaha Beach, 6 June 1944 — the ramp comes down." },
  { sec: "09-liberation", para: 3, find: "the Allied landings in Normandy", img: "n36_debarquement_3", off: 6,
    cap: "Reinforcements coming ashore in the days that followed." },
  { sec: "09-liberation", para: 5, find: "But the Paris insurrection starts", img: "n43_combats_rues",
    cap: "The Paris insurrection — fighters taking cover in a street of the capital, August 1944." },
  { sec: "09-liberation", para: 6, find: "On the German side: General Dietrich", img: "p28_20", pos: "50% 15%",
    cap: "General Dietrich von Choltitz — German commander of \u201CGreater Paris\u201D, August 1944." },
  { sec: "09-liberation", para: 7, find: "under the command of Colonel Henri", img: "p29_21", pos: "50% 12%",
    cap: "Colonel Henri Rol-Tanguy — communist regional commander of the FFI, who forced the insurrection." },
  { sec: "09-liberation", para: 7, find: "And on the other side the Gaullists", img: "n37_de_gaulle",
    cap: "General Charles de Gaulle — leader of Free France." },
  { sec: "09-liberation", para: 7, find: "They controlled most of the police forces", img: "p29_22",
    cap: "General Philippe Leclerc — commander of the French Second Armoured Division." },
  { sec: "09-liberation", para: 8, find: "The Gaullists wanted to delay the insurrection", img: "n37_de_gaulle",
    cap: "The Gaullists want to wait for the Allies — de Gaulle would time his entrance." },
  { sec: "09-liberation", para: 8, find: "The communists led by Rol-Tanguy", img: "p29_21", pos: "50% 12%",
    cap: "Rol-Tanguy wants the insurrection now, without American help." },
  { sec: "09-liberation", para: 8, find: "It starts on the nineteenth of August", img: "p30_23",
    cap: "The call to insurrection posted on the walls of Paris, August 1944." },
  { sec: "09-liberation", para: 8, find: "The two thousand Paris police officers", img: "n42_prefecture_ffi",
    cap: "The gate of the Préfecture de Police, the first stronghold seized by the Resistance." },
  { sec: "09-liberation", para: 9, find: "Two Panthers and a captured Renault", img: "n14_panther_paris",
    cap: "A Panther in Paris, by the Arc de Triomphe — the type of tank sent onto the square." },
  { sec: "09-liberation", para: 10, find: "His plan: an air strike by the Luftwaffe", img: "n38_luftwaffe",
    cap: "A German Heinkel He 111 bomber over Paris." },
  { sec: "09-liberation", para: 12, find: "The communists pushed hard against it", img: "p31_24",
    cap: "The underground press of those days — calling Parisians \u201CTo the barricades!\u201D" },
  { sec: "09-liberation", para: 12, find: "The fighting resumes on the morning", img: "n40_ordre_ffi_22_aout",
    cap: "The FFI notice posted on 22 August: \u201CNo truce has been agreed.\u201D" },
  { sec: "09-liberation", para: 13, find: "Eisenhower and Bradley", img: "n41_eisenhower_bradley",
    cap: "Eisenhower and Bradley, whose decision it was to drive on Paris." },
  { sec: "09-liberation", para: 13, find: "General Leclerc's French Second Armoured Division", img: "n48_carte_normandie_berlin",
    cap: "From Normandy to Berlin — with Paris on the way." },
  { sec: "09-liberation", para: 17, find: "To make sure the police hold it", img: "p29_22",
    cap: "General Leclerc — it is he who orders the air mission." },
  { sec: "09-liberation", para: 18, find: "Captain Jean Callet was at the controls", img: "n18_callet_mantoux",
    cap: "The crew of the mission: Captain Jean Callet and Lieutenant Étienne Mantoux." },
  { sec: "09-liberation", para: 18, find: "He takes off around five in the afternoon", img: "p33_27",
    cap: "A Piper Cub — the light reconnaissance aircraft used for the mission." },
  { sec: "09-liberation", para: 18, find: "the plan is to follow the Seine", img: "p34_28",
    cap: "The route of the mission — over Paris, to the Préfecture, and back." },
  { sec: "09-liberation", para: 18, find: "He aims true, and the message lands", img: "p35_29",
    cap: "The message dropped by Mantoux into the courtyard of the Préfecture, signed Leclerc." },
  { sec: "09-liberation", para: 19, find: "They then carry on along the Seine", img: "p36_30",
    cap: "The official report of the mission, written after the pilots returned." },
  { sec: "09-liberation", para: 20, find: "make their official entry into Paris", img: "n44_2edb_paris",
    cap: "The French Second Armoured Division in Paris, 25 August 1944." },
  { sec: "09-liberation", para: 20, find: "Fighting rages all across the city", img: "n43_combats_rues",
    cap: "Fighting rages across the whole city." },
  { sec: "09-liberation", para: 20, find: "But around three in the afternoon", img: "n46_reddition_choltitz",
    cap: "Von Choltitz taken prisoner, 25 August 1944." },
  { sec: "09-liberation", para: 20, find: "And then, one by one, the German strongholds", img: "p37_31",
    cap: "German soldiers escorted out of the Hôtel Meurice, von Choltitz's HQ, on 25 August 1944." },
  { sec: "09-liberation", para: 20, find: "By the evening of the twenty-fifth of August", img: "n45_paris_libere",
    cap: "Rue de Rivoli on the evening of 25 August — Paris is liberated." },
  { sec: "09-liberation", para: 21, find: "de Gaulle would claim victory", img: "p38_32",
    cap: "General de Gaulle walking down the Champs-Élysées, 26 August 1944." },
  { sec: "09-liberation", para: 24, find: "Thank you for walking with me", img: "g09_guide_fin",
    cap: "See you soon — Clement." },
];


const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");
let failed = 0;

for (const [lang, specs] of [["fr", SPECS], ["en", EN_SPECS]] as const) {
const out: Record<string, unknown[]> = {};

for (const def of SECTIONS) {
  const paragraphs = splitParagraphs(readFileSync(scriptPath(def, lang), "utf8"));
  const cues: unknown[] = [];
  for (const s of specs.filter((x) => x.sec === def.id)) {
    const para = paragraphs[s.para];
    if (para === undefined) { console.error(`✗ ${s.sec} p${s.para} does not exist`); failed++; continue; }
    const sentences = splitSentences(para).map((x) => x.text);
    const idx = sentences.findIndex((x) => norm(x).includes(norm(s.find)));
    if (idx === -1) { console.error(`✗ ${s.sec} p${s.para} "${s.find}" not found in:\n    ${sentences.join("\n    ")}`); failed++; continue; }
    const startsWith = sentences[idx]!.split(/\s+/).slice(0, 6).join(" ");
    cues.push({
      img: s.img, cap: s.cap, anchor: { paragraph: s.para, startsWith },
      ...(s.off !== undefined ? { offsetSec: s.off } : {}),
      ...(s.pos !== undefined ? { pos: s.pos } : {}),
      ...(s.route !== undefined ? { route: s.route } : {}),
      ...(s.offensive !== undefined ? { offensive: s.offensive } : {}),
      ...(s.strategic !== undefined ? { strategic: s.strategic } : {}),
    });
    const extra = [s.off !== undefined ? `${s.off > 0 ? "+" : ""}${s.off}s` : "", s.pos ?? ""].filter(Boolean).join(" ");
    console.log(`✓ ${lang} ${s.sec} p${s.para}.s${idx} ${s.img.padEnd(22)} ${extra.padEnd(14)} ${startsWith}`);
  }
  out[def.id] = cues;
}

if (failed) { console.error(`\n${failed} unresolved spec(s) — nothing written.`); process.exit(1); }
writeFileSync(resolve(PATHS.configDir, `media-cues.${lang}.json`), JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote media-cues.${lang}.json — ${specs.length} cues.\n`);
}
