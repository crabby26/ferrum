/* =========================================================
   data.js – eingebaute Offline-Lebensmittel, Übungen, Vorlagen
   Nährwerte je 100 g (Durchschnittswerte, gerundet)
   Format: [Name, kcal, Protein, Kohlenhydrate, Fett, Portionen, Kategorie]
   Portionen: "Name:Gramm|Name:Gramm"
   ========================================================= */
'use strict';

const BASIC_RAW = [
  // Getreide, Brot & Beilagen
  ['Haferflocken', 372, 13.5, 58.7, 7, 'EL:10|Portion:60', 'Getreide & Beilagen'],
  ['Reis (roh)', 350, 7, 77, 0.6, 'Portion:75', 'Getreide & Beilagen'],
  ['Reis (gekocht)', 130, 2.7, 28, 0.3, 'Portion:200', 'Getreide & Beilagen'],
  ['Basmatireis (roh)', 355, 8, 78, 0.8, 'Portion:75', 'Getreide & Beilagen'],
  ['Nudeln (roh)', 355, 12.5, 70, 1.5, 'Portion:100', 'Getreide & Beilagen'],
  ['Nudeln (gekocht)', 150, 5.2, 30, 0.8, 'Portion:250', 'Getreide & Beilagen'],
  ['Vollkornnudeln (roh)', 345, 14, 64, 2.5, 'Portion:100', 'Getreide & Beilagen'],
  ['Kartoffeln (gekocht)', 72, 2, 15, 0.1, 'Stück:100', 'Getreide & Beilagen'],
  ['Süßkartoffel', 86, 1.6, 20, 0.1, 'Stück:200', 'Getreide & Beilagen'],
  ['Couscous (roh)', 355, 13, 72, 1.5, 'Portion:75', 'Getreide & Beilagen'],
  ['Bulgur (roh)', 342, 12, 63, 1.3, 'Portion:75', 'Getreide & Beilagen'],
  ['Quinoa (roh)', 368, 14, 64, 6, 'Portion:75', 'Getreide & Beilagen'],
  ['Gnocchi', 155, 4, 33, 0.3, 'Portion:200', 'Getreide & Beilagen'],
  ['Vollkornbrot', 215, 7, 38, 1.5, 'Scheibe:50', 'Getreide & Beilagen'],
  ['Toastbrot', 260, 8, 48, 3.5, 'Scheibe:25', 'Getreide & Beilagen'],
  ['Brötchen (Weizen)', 270, 9, 53, 1.5, 'Stück:60', 'Getreide & Beilagen'],
  ['Vollkornbrötchen', 250, 9.5, 44, 3, 'Stück:70', 'Getreide & Beilagen'],
  ['Knäckebrot', 335, 9, 63, 1.5, 'Scheibe:10', 'Getreide & Beilagen'],
  ['Reiswaffeln', 385, 8, 81, 2.8, 'Stück:8', 'Getreide & Beilagen'],
  ['Wrap (Weizen-Tortilla)', 305, 8.5, 50, 7, 'Stück:60', 'Getreide & Beilagen'],
  ['Cornflakes', 375, 7, 84, 0.9, 'Portion:30', 'Getreide & Beilagen'],
  ['Müsli (ohne Zuckerzusatz)', 360, 10, 58, 7, 'Portion:50', 'Getreide & Beilagen'],
  ['Granola', 450, 9, 62, 17, 'Portion:50', 'Getreide & Beilagen'],

  // Fleisch & Fisch
  ['Hähnchenbrust (roh)', 108, 23.5, 0, 1.2, 'Stück:150', 'Fleisch & Fisch'],
  ['Hähnchenbrust (gebraten)', 160, 31, 0, 3.5, 'Portion:150', 'Fleisch & Fisch'],
  ['Putenbrust (roh)', 105, 24, 0, 1, 'Stück:150', 'Fleisch & Fisch'],
  ['Rinderhack (roh, 20 % Fett)', 250, 18, 0, 20, 'Portion:125', 'Fleisch & Fisch'],
  ['Rinderhack mager (5 % Fett)', 125, 21, 0, 5, 'Portion:125', 'Fleisch & Fisch'],
  ['Hackfleisch gemischt (roh)', 260, 18, 0, 21, 'Portion:125', 'Fleisch & Fisch'],
  ['Rindersteak (Hüfte, roh)', 120, 22, 0, 3.5, 'Stück:200', 'Fleisch & Fisch'],
  ['Schweinefilet (roh)', 110, 21, 0, 2.5, 'Portion:150', 'Fleisch & Fisch'],
  ['Lachs (roh)', 200, 20, 0, 13, 'Filet:125', 'Fleisch & Fisch'],
  ['Thunfisch (Dose, in Wasser)', 110, 25, 0, 1, 'Dose:150', 'Fleisch & Fisch'],
  ['Seelachs / Kabeljau (roh)', 80, 18, 0, 0.8, 'Filet:125', 'Fleisch & Fisch'],
  ['Garnelen (gegart)', 85, 19, 0, 1, 'Portion:100', 'Fleisch & Fisch'],
  ['Kochschinken', 110, 19, 1, 3.5, 'Scheibe:20', 'Fleisch & Fisch'],
  ['Putenbrust-Aufschnitt', 100, 21, 1, 1.2, 'Scheibe:15', 'Fleisch & Fisch'],
  ['Salami', 380, 22, 1, 32, 'Scheibe:8', 'Fleisch & Fisch'],
  ['Bratwurst', 300, 13, 1, 27, 'Stück:100', 'Fleisch & Fisch'],

  // Eier & Milchprodukte
  ['Ei (Größe M)', 143, 12.6, 0.7, 9.9, 'Stück:55', 'Eier & Milchprodukte'],
  ['Eiklar', 50, 11, 0.7, 0.2, 'Stück:33', 'Eier & Milchprodukte'],
  ['Magerquark', 67, 12, 4, 0.3, 'Becher:250|EL:30', 'Eier & Milchprodukte'],
  ['Speisequark 20 %', 110, 12, 3.5, 5, 'Becher:250', 'Eier & Milchprodukte'],
  ['Skyr natur', 63, 11, 4, 0.2, 'Becher:150|Portion:250', 'Eier & Milchprodukte'],
  ['Griechischer Joghurt 10 %', 125, 5, 4, 10, 'Portion:150', 'Eier & Milchprodukte'],
  ['Naturjoghurt 1,5 %', 46, 3.8, 4.7, 1.5, 'Becher:150', 'Eier & Milchprodukte'],
  ['Naturjoghurt 3,5 %', 64, 3.8, 4.5, 3.5, 'Becher:150', 'Eier & Milchprodukte'],
  ['Milch 1,5 %', 47, 3.4, 4.8, 1.5, 'Glas:250', 'Eier & Milchprodukte'],
  ['Milch 3,5 %', 64, 3.3, 4.8, 3.5, 'Glas:250', 'Eier & Milchprodukte'],
  ['Körniger Frischkäse', 98, 12.5, 2, 4.3, 'Becher:200', 'Eier & Milchprodukte'],
  ['Frischkäse natur', 225, 5.4, 4, 21, 'EL:20', 'Eier & Milchprodukte'],
  ['Gouda', 360, 25, 0, 29, 'Scheibe:20', 'Eier & Milchprodukte'],
  ['Mozzarella', 245, 18, 1, 19, 'Kugel:125', 'Eier & Milchprodukte'],
  ['Mozzarella light', 160, 19, 1, 9, 'Kugel:125', 'Eier & Milchprodukte'],
  ['Feta', 260, 17, 0.5, 21, 'Portion:50', 'Eier & Milchprodukte'],
  ['Parmesan', 390, 33, 0, 28, 'EL:5', 'Eier & Milchprodukte'],
  ['Butter', 740, 0.7, 0.6, 82, 'Portion:10', 'Eier & Milchprodukte'],
  ['Proteinpudding', 75, 10, 6, 1.5, 'Becher:200', 'Eier & Milchprodukte'],

  // Protein & Supplements
  ['Whey Protein (Pulver)', 380, 75, 7, 6, 'Scoop:30', 'Protein'],
  ['Casein (Pulver)', 360, 80, 5, 1.5, 'Scoop:30', 'Protein'],
  ['Proteinriegel', 335, 33, 28, 9, 'Riegel:60', 'Protein'],
  ['Tofu natur', 125, 13, 1.5, 7.5, 'Portion:100', 'Protein'],

  // Obst
  ['Banane', 93, 1.1, 20, 0.2, 'Stück:120', 'Obst'],
  ['Apfel', 54, 0.3, 12, 0.2, 'Stück:150', 'Obst'],
  ['Orange', 47, 1, 9, 0.2, 'Stück:150', 'Obst'],
  ['Kiwi', 55, 1, 10, 0.6, 'Stück:75', 'Obst'],
  ['Blaubeeren', 50, 0.7, 10, 0.6, 'Schale:125', 'Obst'],
  ['Erdbeeren', 33, 0.8, 5.5, 0.4, 'Schale:250', 'Obst'],
  ['Himbeeren', 36, 1.3, 4.8, 0.3, 'Schale:125', 'Obst'],
  ['Weintrauben', 70, 0.7, 16, 0.3, 'Portion:125', 'Obst'],
  ['Ananas', 55, 0.5, 12, 0.2, 'Portion:150', 'Obst'],
  ['Mango', 62, 0.6, 13, 0.4, 'Stück:300', 'Obst'],
  ['Avocado', 160, 2, 3.6, 15, 'Stück:140', 'Obst'],
  ['Datteln (getrocknet)', 285, 2, 65, 0.4, 'Stück:10', 'Obst'],
  ['Rosinen', 300, 2.5, 69, 0.5, 'EL:15', 'Obst'],

  // Gemüse & Hülsenfrüchte
  ['Brokkoli', 35, 3.8, 2.7, 0.2, 'Portion:200', 'Gemüse & Hülsenfrüchte'],
  ['Spinat', 22, 2.8, 0.8, 0.4, 'Portion:150', 'Gemüse & Hülsenfrüchte'],
  ['Tomate', 18, 0.9, 2.9, 0.2, 'Stück:100', 'Gemüse & Hülsenfrüchte'],
  ['Gurke', 14, 0.6, 2.1, 0.1, 'Stück:400', 'Gemüse & Hülsenfrüchte'],
  ['Paprika (rot)', 31, 1, 6, 0.3, 'Stück:160', 'Gemüse & Hülsenfrüchte'],
  ['Karotte', 36, 0.9, 7.2, 0.2, 'Stück:80', 'Gemüse & Hülsenfrüchte'],
  ['Zucchini', 18, 1.5, 2.2, 0.3, 'Stück:250', 'Gemüse & Hülsenfrüchte'],
  ['Champignons', 20, 3, 0.6, 0.3, 'Portion:150', 'Gemüse & Hülsenfrüchte'],
  ['Zwiebel', 35, 1.2, 7, 0.2, 'Stück:80', 'Gemüse & Hülsenfrüchte'],
  ['Eisbergsalat', 14, 1, 2, 0.2, 'Portion:100', 'Gemüse & Hülsenfrüchte'],
  ['Erbsen (TK)', 81, 5.6, 12, 0.5, 'Portion:150', 'Gemüse & Hülsenfrüchte'],
  ['Mais (Dose)', 82, 2.9, 15, 1.2, 'Dose:140', 'Gemüse & Hülsenfrüchte'],
  ['Kidneybohnen (Dose, abgetropft)', 100, 7, 13, 0.5, 'Dose:250', 'Gemüse & Hülsenfrüchte'],
  ['Kichererbsen (Dose, abgetropft)', 120, 7, 15, 2.5, 'Dose:240', 'Gemüse & Hülsenfrüchte'],
  ['Rote Linsen (roh)', 340, 24, 50, 1.6, 'Portion:75', 'Gemüse & Hülsenfrüchte'],
  ['Hummus', 280, 7.5, 12, 22, 'EL:20', 'Gemüse & Hülsenfrüchte'],

  // Nüsse, Samen & Fette
  ['Mandeln', 600, 22, 6, 53, 'Handvoll:30', 'Nüsse & Fette'],
  ['Walnüsse', 665, 15, 7, 65, 'Handvoll:30', 'Nüsse & Fette'],
  ['Erdnüsse (geröstet)', 600, 25, 9, 49, 'Handvoll:30', 'Nüsse & Fette'],
  ['Erdnussbutter', 610, 26, 10, 50, 'EL:15', 'Nüsse & Fette'],
  ['Chiasamen', 490, 17, 8, 31, 'EL:12', 'Nüsse & Fette'],
  ['Leinsamen', 520, 18, 2, 42, 'EL:10', 'Nüsse & Fette'],
  ['Olivenöl', 884, 0, 0, 100, 'EL:10|TL:4', 'Nüsse & Fette'],
  ['Rapsöl', 884, 0, 0, 100, 'EL:10|TL:4', 'Nüsse & Fette'],
  ['Mayonnaise', 700, 1, 2, 76, 'EL:15', 'Nüsse & Fette'],

  // Süßes, Snacks & Getränke
  ['Zartbitterschokolade 70 %', 575, 9, 34, 42, 'Stück:10', 'Snacks & Süßes'],
  ['Vollmilchschokolade', 535, 6.5, 57, 30, 'Stück:10', 'Snacks & Süßes'],
  ['Honig', 310, 0.4, 76, 0, 'TL:8', 'Snacks & Süßes'],
  ['Marmelade', 250, 0.4, 60, 0.1, 'TL:10', 'Snacks & Süßes'],
  ['Zucker', 400, 0, 100, 0, 'TL:5', 'Snacks & Süßes'],
  ['Ketchup', 102, 1.2, 23, 0.1, 'EL:15', 'Snacks & Süßes'],
  ['Pizza Margherita (TK)', 240, 10, 30, 9, 'Pizza:350', 'Snacks & Süßes'],
  ['Pommes frites (zubereitet)', 290, 3.5, 36, 14, 'Portion:150', 'Snacks & Süßes'],
  ['Wasser', 0, 0, 0, 0, 'Glas:250|Flasche:500', 'Getränke'],
  ['Fanta Orange', 31, 0, 7.6, 0, 'Dose:330|Flasche:500', 'Getränke'],
  ['Fanta Zero', 2, 0, 0.4, 0, 'Dose:330|Flasche:500', 'Getränke'],
  ['Sprite', 19, 0, 4.6, 0, 'Dose:330|Flasche:500', 'Getränke'],
  ['Apfelschorle', 24, 0, 5.5, 0, 'Glas:250|Flasche:500', 'Getränke'],
  ['Apfelsaft', 46, 0.1, 11, 0.1, 'Glas:200', 'Getränke'],
  ['Eistee Pfirsich', 19, 0, 4.5, 0, 'Flasche:500', 'Getränke'],
  ['Energy Drink', 46, 0, 11, 0, 'Dose:250', 'Getränke'],
  ['Energy Drink zuckerfrei', 3, 0, 0, 0, 'Dose:250', 'Getränke'],
  ['Kaffee schwarz', 2, 0.2, 0.3, 0, 'Tasse:200', 'Getränke'],
  ['Tee ungesüßt', 1, 0, 0.2, 0, 'Tasse:250', 'Getränke'],
  ['Cola', 42, 0, 10.6, 0, 'Dose:330', 'Getränke'],
  ['Cola Zero', 0.3, 0, 0, 0, 'Dose:330', 'Getränke'],
  ['Orangensaft', 45, 0.7, 10, 0.2, 'Glas:200', 'Getränke'],
  ['Hafermilch', 46, 1, 6.7, 1.5, 'Glas:250', 'Getränke'],
  ['Sojadrink ungesüßt', 33, 3.3, 0.2, 1.8, 'Glas:250', 'Getränke'],
  ['Bier (Pils)', 42, 0.5, 3, 0, 'Flasche:500', 'Getränke'],
  ['Kaffee mit Milch', 15, 1, 1.4, 0.6, 'Tasse:200', 'Getränke']
];

const BASIC_FOODS = BASIC_RAW.map(r => ({
  id: 'b:' + U.slug(r[0]),
  name: r[0],
  kcal: r[1], p: r[2], c: r[3], f: r[4],
  units: r[5] ? r[5].split('|').map(u => { const i = u.lastIndexOf(':'); return { n: u.slice(0, i), g: +u.slice(i + 1) }; }) : [],
  cat: r[6],
  src: 'basic',
  // Getränke und Milch zählen automatisch zum Wasser (Menge in ml)
  liquid: r[6] === 'Getränke' || /^Milch /.test(r[0]) || undefined
}));

/* ---------- Übungen ---------- */
const EX_RAW = [
  ['Bankdrücken (Langhantel)', 'Brust'],
  ['Schrägbankdrücken (Kurzhantel)', 'Brust'],
  ['Kurzhantel-Bankdrücken', 'Brust'],
  ['Butterfly (Maschine)', 'Brust'],
  ['Kabelzug-Crossover', 'Brust'],
  ['Dips', 'Brust'],
  ['Schulterdrücken (Kurzhantel)', 'Schultern'],
  ['Military Press (Langhantel)', 'Schultern'],
  ['Seitheben', 'Schultern'],
  ['Face Pulls', 'Schultern'],
  ['Reverse Flys', 'Schultern'],
  ['Trizepsdrücken am Kabel', 'Trizeps'],
  ['Overhead Trizeps-Extension', 'Trizeps'],
  ['French Press (SZ)', 'Trizeps'],
  ['Klimmzüge', 'Rücken'],
  ['Latziehen', 'Rücken'],
  ['Langhantelrudern', 'Rücken'],
  ['Kabelrudern sitzend', 'Rücken'],
  ['Kurzhantelrudern einarmig', 'Rücken'],
  ['Kreuzheben', 'Rücken'],
  ['Shrugs', 'Rücken'],
  ['Langhantel-Curls', 'Bizeps'],
  ['Kurzhantel-Curls', 'Bizeps'],
  ['Hammer Curls', 'Bizeps'],
  ['Preacher Curls (SZ)', 'Bizeps'],
  ['Kniebeugen', 'Beine'],
  ['Beinpresse', 'Beine'],
  ['Rumänisches Kreuzheben', 'Beine'],
  ['Beinstrecker', 'Beine'],
  ['Beinbeuger liegend', 'Beine'],
  ['Ausfallschritte', 'Beine'],
  ['Bulgarian Split Squats', 'Beine'],
  ['Hip Thrust', 'Beine'],
  ['Wadenheben stehend', 'Beine'],
  ['Crunches am Kabel', 'Bauch'],
  ['Beinheben hängend', 'Bauch']
];
const DEFAULT_EXERCISES = EX_RAW.map(r => ({ id: 'e:' + U.slug(r[0]), name: r[0], muscle: r[1], custom: false }));

const MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Bauch', 'Sonstiges'];

function tplEx(name, sets, reps) {
  return { exId: 'e:' + U.slug(name), sets, reps };
}
const DEFAULT_TEMPLATES = [
  {
    id: 't:push', name: 'Push', order: 0, exercises: [
      tplEx('Bankdrücken (Langhantel)', 4, '6-8'),
      tplEx('Schrägbankdrücken (Kurzhantel)', 3, '8-10'),
      tplEx('Schulterdrücken (Kurzhantel)', 3, '8-10'),
      tplEx('Seitheben', 3, '12-15'),
      tplEx('Trizepsdrücken am Kabel', 3, '10-12'),
      tplEx('Overhead Trizeps-Extension', 3, '10-12')
    ]
  },
  {
    id: 't:pull', name: 'Pull', order: 1, exercises: [
      tplEx('Klimmzüge', 3, '6-10'),
      tplEx('Langhantelrudern', 3, '8-10'),
      tplEx('Latziehen', 3, '10-12'),
      tplEx('Kabelrudern sitzend', 3, '10-12'),
      tplEx('Face Pulls', 3, '15'),
      tplEx('Langhantel-Curls', 3, '8-12'),
      tplEx('Hammer Curls', 3, '10-12')
    ]
  },
  {
    id: 't:legs', name: 'Legs', order: 2, exercises: [
      tplEx('Kniebeugen', 4, '6-8'),
      tplEx('Rumänisches Kreuzheben', 3, '8-10'),
      tplEx('Beinpresse', 3, '10-12'),
      tplEx('Beinbeuger liegend', 3, '10-12'),
      tplEx('Beinstrecker', 3, '12-15'),
      tplEx('Wadenheben stehend', 4, '12-15')
    ]
  }
];
