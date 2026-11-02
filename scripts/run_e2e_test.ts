// Runner du Scénario de Test de Bout en Bout - Prompt 5/5
// Simule l'environnement navigateur (localStorage) si exécuté via Node/tsx

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
}

import { runFullEndToEndTestScenario, cleanupTestData } from '../src/lib/classSStore';

async function main() {
  console.log('===============================================================');
  console.log('  LE SYSTÈME • SCÉNARIO DE TEST COMPLET DE BOUT EN BOUT (1-13) ');
  console.log('===============================================================\n');

  const startTime = Date.now();
  const result = await runFullEndToEndTestScenario();
  const totalDuration = Date.now() - startTime;

  console.log('Résultats détaillés par étape :');
  console.log('---------------------------------------------------------------');
  for (const step of result.steps) {
    const icon = step.success ? '✓' : '✗';
    const statusText = step.success ? 'SUCCÈS' : 'ÉCHEC';
    console.log(`[${icon}] ${step.name.padEnd(65, ' ')} [${statusText}]`);
    if (step.details) {
      console.log(`    Détails : ${JSON.stringify(step.details)}`);
    }
  }
  console.log('---------------------------------------------------------------');
  console.log(`Durée totale d'exécution : ${totalDuration} ms`);

  if (!result.success) {
    console.error(`\nErreur rencontrée : ${result.error}`);
    process.exit(1);
  }

  console.log('\nExécution du script de nettoyage des données de test...');
  const cleanup = await cleanupTestData();
  console.log(`Nettoyage achevé avec succès : ${cleanup.cleanedCount} enregistrements de test supprimés.`);
  console.log('\n===============================================================');
  console.log('  TOUTES LES 13 ÉTAPES SONT VALIDÉES AVEC SUCCÈS (100 %)      ');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Erreur non gérée :', err);
  process.exit(1);
});
