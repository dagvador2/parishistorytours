// Script + photo cues per section. Timestamps are derived from word counts
// (proportional to each section's audio duration) until the real TTS timestamps
// replace them: each sentence may carry its own `t` (seconds) later.
const P = (img, cap) => ({ img: `photos/${img}.png`, cap });

export const CONTENT = [
  // 0 · Intro
  { subs: [
    'Thank you for being here. If you are listening to this guide, you are probably curious about both Paris and the Second World War.',
    'We will do four main stops along two kilometres, with a few short interstops along the way.',
    'This first stop is a catch-up on how we ended up at war in 1939. The next will cover the fall of Paris.',
    'Stop 3 tells the story of the first Paris resistance network, through the eyes of Agnès Humbert. And we finish at Notre-Dame, with the Liberation.',
    'Take your time. Stop wherever you like to look around. Let’s go back to basics.'
  ], media: [] },
  // 1 · Stop 1 — Context of war
  { subs: [
    'You are standing in front of 60 Boulevard Saint-Michel. Look up at the façade: bullet holes pepper the stone, all the way to the top floor.',
    'The building was requisitioned by the German army during the Occupation. These scars are from the fighting of August 1944. They are real, and untouched.',
    'The First World War ends in 1918. The Germans sign the armistice inside a railway carriage in the forest of Compiègne.',
    'The following year they are forced to sign the Treaty of Versailles — a treaty that brings Germany to its knees.',
    'Territorial sanctions: 15% of its land and all its colonies. Financial: 132 billion gold marks. Military: no armour, no air force, an army capped at 100,000 men.',
    'These sanctions stirred a powerful desire for revenge. The 1929 crash drove poverty through the roof, and Hitler seized power in January 1933.',
    'France and the UK responded with pacifism. The central figure is Neville Chamberlain, who wanted to preserve peace at almost any cost.',
    'Every time Hitler broke a clause of the treaty, the French and British said: we are not going to war over this.',
    'This way of thinking peaked at Munich. In September 1938, Hitler was given the green light to take the Sudetenland.',
    'Chamberlain came home waving the agreement — “peace for our time.” Six months later, Hitler invaded the rest of Czechoslovakia.',
    'Finally, the French and British changed their minds. Poland was the red line.',
    'When Hitler invaded Poland on 1 September 1939, France and the UK declared war two days later.'
  ], media: [
    { at: 2, ...P('p05_0', 'The carriage in the Compiègne forest where the 1918 armistice was signed.') },
    { at: 6, ...P('p06_1', 'Neville Chamberlain — the face of pre-war appeasement.') },
    { at: 8, ...P('p07_2', 'Hitler and Chamberlain at Munich, September 1938.') },
    { at: 9, ...P('p07_3', '“I have here a paper…” Chamberlain returns from Munich.') },
    { at: 11, ...P('p08_4', 'German troops crossing into Poland, 1 September 1939.') }
  ] },
  // 2 · Stop 2 — The Fall of Paris
  { subs: [
    'You are standing in front of the Palais du Luxembourg, home of the French Senate since 1799.',
    'It was here, on 21 May 1940, that Prime Minister Paul Reynaud told the political class the truth: the situation was catastrophic.',
    'But first, let’s set the scene. On 3 September 1939, theatres and cinemas closed, sandbags went up around monuments, gas masks were distributed.',
    'On the front, almost nothing happened. The French called it the drôle de guerre — the phoney war. It lasted eight months.',
    'On 26 February 1940, the first German reconnaissance plane flew over Paris. Paul Reynaud knew war was inevitable and began preparing Parisians.',
    'From 1 April, food restrictions began. Butter disappeared from restaurant tables. Bakeries opened on alternating days.',
    'On 10 May 1940, the easy months ended for good. The Germans attacked Belgium and the Netherlands — exactly as General Gamelin had predicted.',
    'He moved one million men north. Then on 13 May, the real attack came lower, through the Ardennes, declared impassable by armour.',
    'Tanks and Stuka dive-bombers crossed the Ardennes and the Meuse in two days. The road to Paris was open.',
    'On 16 May, an emergency war committee met at the Quai d’Orsay. Outside, ministry staff were burning a hundred tonnes of classified archives in the courtyard.',
    'Parisians knew none of this. The front page of 16 May told them the Germans had been “halted.” None of it was true.',
    'Look back at the palace. On 21 May, Reynaud spoke of a rout, of a “fault, perhaps a crime.” Weygand replaced Gamelin; Marshal Pétain joined the government.',
    'On 3 June 1940, German bombers struck the 15th arrondissement. More than 250 people died.',
    'By 10 June every minister had fled. Of 2.8 million Parisians, only 700,000 stayed.',
    'On 14 June, the Germans entered Paris. The Nazi flag went up on the Arc de Triomphe and the Eiffel Tower.',
    'A week later, Hitler made his only visit to Paris. Three hours, at dawn, in the city he had dreamed of conquering.',
    'And on 22 June 1940, France signed the armistice — in the very same railway carriage of 1918.'
  ], media: [
    { at: 4, ...P('p10_5', 'Paul Reynaud, Prime Minister of France from March 1940.') },
    { at: 6, ...P('p11_6', 'The German offensive of May 1940 — the feint in the north, the real attack through the Ardennes.') },
    { at: 7, ...P('p11_7', 'General Maurice Gamelin, commander-in-chief in May 1940.') },
    { at: 10, ...P('p13_8', 'Le Petit Parisien, 16 May 1940. Reassuring — and false.') },
    { at: 12, ...P('p14_9', 'The aftermath of the bombing of Paris, 3 June 1940.') },
    { at: 14, ...P('p15_10', 'The Nazi flag over the Arc de Triomphe, June 1940.') },
    { at: 15, ...P('p16_11', 'Hitler at the Trocadéro, 23 June 1940.') },
    { at: 16, ...P('p17_13', 'France divided after the armistice: occupied zone, Vichy zone, annexed Alsace-Moselle.') }
  ] },
  // 3 · Interstop — Odéon
  { subs: [
    'As you walk past the Théâtre de l’Odéon, look at the left-hand side of the building. A small plaque is set into the stone.',
    'It is dedicated to Jacques Guierre, an FFI fighter killed on this square at the age of 20, on the morning of 25 August 1944.',
    'The FFI did not fight a conventional battle. Their role was to disrupt the Germans and pass intelligence to the Allies.',
    'Jacques Guierre died here, on this very morning. The plaque is the only mark of it.'
  ], media: [] },
  // 4 · Stop 3 — Resistance
  { subs: [
    'You are at the corner of Rue Monsieur-le-Prince and Rue de Vaugirard. Nothing here marks the spot — and that is partly the point.',
    'In the autumn of 1940, a small group of Paris intellectuals began meeting in this neighbourhood to plan France’s first organised resistance network.',
    'Agnès Humbert, art historian and museum curator, returned to Paris in August 1940. Very quickly, she noticed what had changed.',
    'Everything was labelled in German. Museums were free for German soldiers. Whole exhibitions had been altered or removed.',
    'Across town, the Musée de l’Homme became a meeting point for intellectuals who refused the Occupation. The network took its name.',
    '“It’s as if we were rats in a trap,” she wrote in her diary. Her closest ally was Jean Cassou, a fellow curator.',
    'By September 1940 they were ten people, meeting weekly at 14 Rue de l’Abbaye. Their clock stayed on French time — a tiny daily act of defiance.',
    'They started with hand-written notes left on metro benches. By the end of September they had a stencil duplicator.',
    'On 15 December 1940 they published the first issue of their newspaper. They called it Résistance — and the word would stick.',
    'They managed four editions. The network grew too fast, and they brought in a man they should not have trusted: Albert Gaveau, who worked for the Gestapo.',
    'Agnès Humbert was arrested on 13 April 1941. She survived the camps, and published her diary, Notre Guerre, in 1946.'
  ], media: [
    { at: 4, ...P('p20_14', 'The Musée de l’Homme at the Trocadéro — the museum that gave its name to the network.') },
    { at: 5, ...P('p21_15', 'Jean Cassou — co-founder of the Musée de l’Homme network.') },
    { at: 8, ...P('p22_16', 'The first issue of Résistance, December 1940.') },
    { at: 10, ...P('p23_17', 'Notre Guerre — Agnès Humbert’s diary, published in 1946.') }
  ] },
  // 5 · Interstop — Sorbonne façade
  { subs: [
    'Stand in front of the Sorbonne’s main entrance and look closely at the right-hand column.',
    'The bullet holes are still there — Liberation-week scars the university has chosen never to repair.',
    'The Latin Quarter became one of the fiercest battlegrounds of the August 1944 insurrection.'
  ], media: [] },
  // 6 · Interstop — Observatory tower
  { subs: [
    'Look up at the observatory tower. It is covered in bullet holes — far more than the main façade. Take a moment to count them.',
    'Height and a clear line of fire: exactly what both sides wanted control of.'
  ], media: [] },
  // 7 · Interstop — Saint-Séverin
  { subs: [
    'You are in front of the Église Saint-Séverin, on Rue du Petit-Pont. Compare the street with the photograph — it was taken right here in August 1944.',
    'More than 600 barricades were built across Paris that week: cobblestones, café tables, mattresses, doors — anything heavy enough to slow a tank.',
    'The Germans had 22,000 men and 100 tanks. Every time they moved armour, infantry had to clear the way first, under fire from the windows above.',
    'A few streets from here, at 30 Rue Saint-Jacques, the architecture students built what witnesses called the most elegant barricade of the insurrection.'
  ], media: [
    { at: 0, ...P('p25_18', 'Barricade on Rue du Petit-Pont, in front of Saint-Séverin — August 1944.') },
    { at: 3, ...P('p26_19', 'Barricade at 30 Rue Saint-Jacques, built by the architecture students of Paris.') }
  ] },
  // 8 · Stop 4 — Liberation
  { subs: [
    'You are facing Notre-Dame. But this stop is really about the building to its right: the Préfecture de Police, where the Liberation of Paris began.',
    'Paris in August 1944 came terrifyingly close to the fate of Warsaw, where 170,000 civilians died and 85% of the city was destroyed.',
    'The Allies did not plan to liberate Paris. Street fighting, no strategic value, and three million mouths to feed.',
    'On the German side: General Dietrich von Choltitz, brought to Paris by Hitler on 10 August to crush any insurrection.',
    'On the French side, two camps: the Communists under Colonel Rol-Tanguy, and the Gaullists, with General Leclerc racing east with the 2nd Armoured Division.',
    'The insurrection began on 19 August 1944 — the 1,518th day of the Occupation.',
    'The Paris police seized the Préfecture for de Gaulle. At 3:30 p.m. two Panthers rolled onto the parvis in front of you and opened fire.',
    'The Swedish consul Raoul Nordling brokered a truce. It did not hold. Rol-Tanguy: “Paris is worth 200,000 dead.”',
    'On 23 August, Hitler ordered that the Allies find only ruins. The 42 bridges, the Luxembourg Palace, the Invalides — everything was wired.',
    'On the afternoon of 24 August, Leclerc ordered two pilots to fly over Paris and drop a message into the Préfecture courtyard: hold on, we are coming.',
    'Captain Jean Callet flew. Lieutenant Étienne Mantoux held the message, in a Piper Cub.',
    'Eight hundred metres from the Préfecture, Callet nosed into a dive to fake a crash. At the last moment he pulled up, and Mantoux dropped the message. It landed in the courtyard.',
    'The plane took 13 bullet holes. Callet survived the war. Mantoux was killed on 29 April 1945, ten days before Victory in Europe.',
    'At 9:22 p.m., Captain Dronne’s detachment reached the Hôtel de Ville. Around 9:30, the great bell of Notre-Dame — Emmanuel, right in front of you — rang out for the first time in four years.',
    'On 25 August, Leclerc and the US 4th Infantry entered Paris. The streets erupted.',
    'On 26 August, de Gaulle walked down the Champs-Élysées. “Paris liberated! By itself, by its people.”',
    'This is where our tour ends. Thank you for walking with me. — Clément'
  ], media: [
    { at: 3, ...P('p28_20', 'General Dietrich von Choltitz — German commander of Greater Paris, August 1944.') },
    { at: 4, ...P('p29_22', 'General Philippe Leclerc — commander of the French 2nd Armoured Division.') },
    { at: 5, ...P('p30_23', 'The call to insurrection plastered on Paris walls, August 1944.') },
    { at: 7, ...P('p31_24', 'The clandestine press: “To the barricades!”') },
    { at: 10, ...P('p33_27', 'A Piper Cub — the type of light aircraft used for the mission.') },
    { at: 11, ...P('p34_28', 'The flight path of the mission over Paris.') },
    { at: 12, ...P('p35_29', 'The message dropped into the Préfecture courtyard, signed by Leclerc.') },
    { at: 14, ...P('p37_31', 'German soldiers marched out of the Hôtel Meurice, 25 August 1944.') },
    { at: 15, ...P('p38_32', 'General de Gaulle descending the Champs-Élysées, 26 August 1944.') }
  ] }
];

// Derive timestamps: t proportional to cumulative word count over the section duration.
export function timeline(section, durationSec) {
  const words = section.subs.map(s => s.split(/\s+/).length), total = words.reduce((a, b) => a + b, 0);
  let acc = 0;
  const subs = section.subs.map((text, i) => { const t = Math.round(durationSec * acc / total); acc += words[i]; return { t, text }; });
  const media = section.media.map(m => ({ t: subs[m.at] ? subs[m.at].t : 0, img: m.img, cap: m.cap }));
  return { subs, media };
}
