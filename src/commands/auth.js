import { Command } from 'commander';
import { readAuth, writeAuth, readDefaults, writeDefaults, clearConfig, getConfigPaths } from '../utils/config.js';
import { success, error } from '../utils/output.js';

export function createAuthCommand(getGlobalOpts = () => ({})) {
  const auth = new Command('auth')
    .description('Manage authentication and configuration');

  auth
    .command('set-cookie <cookie>')
    .description('Store Hoppscotch session cookie')
    .action((cookie) => {
      writeAuth({ cookie });
      success('Cookie saved to ~/.hoppscotch/auth.json');
    });

  auth
    .command('set-endpoint <url>')
    .description('Store GraphQL API endpoint')
    .action((url) => {
      writeAuth({ endpoint: url });
      success(`Endpoint saved: ${url}`);
    });

  auth
    .command('set-default')
    .description('Store default team/collection IDs')
    .option('--team <id>', 'Default team ID')
    .option('--collection <id>', 'Default collection ID')
    .action((opts) => {
      if (!opts.team && !opts.collection) {
        error('Provide --team and/or --collection');
        process.exit(4);
      }
      const defaults = {};
      if (opts.team) defaults.teamId = opts.team;
      if (opts.collection) defaults.collectionId = opts.collection;
      writeDefaults(defaults);
      success('Defaults saved to ~/.hoppscotch/defaults.json');
      if (opts.team) console.log(`  Team ID: ${opts.team}`);
      if (opts.collection) console.log(`  Collection ID: ${opts.collection}`);
    });

  auth
    .command('status')
    .description('Show current configuration')
    .action(() => {
      const globalOpts = getGlobalOpts();
      const authConfig = readAuth();
      const defaults = readDefaults();
      const paths = getConfigPaths();
      const ready = authConfig.endpoint && authConfig.cookie;

      if (globalOpts.json) {
        console.log(JSON.stringify({
          endpoint: authConfig.endpoint || null,
          cookie: authConfig.cookie ? '[set]' : null,
          cookieLength: authConfig.cookie ? authConfig.cookie.length : 0,
          configFile: paths.AUTH_FILE,
          defaults: {
            teamId: defaults.teamId || null,
            collectionId: defaults.collectionId || null
          },
          defaultsFile: paths.DEFAULTS_FILE,
          status: ready ? 'Ready' : 'Not configured'
        }, null, 2));
        return;
      }

      console.log('Configuration:');
      console.log(`  Endpoint:    ${authConfig.endpoint || '(not set)'}`);
      console.log(`  Cookie:      ${authConfig.cookie ? `[set] (${authConfig.cookie.length} chars)` : '(not set)'}`);
      console.log(`  Config file: ${paths.AUTH_FILE}`);
      console.log('');
      console.log('Defaults:');
      console.log(`  Team ID:       ${defaults.teamId || '(not set)'}`);
      console.log(`  Collection ID: ${defaults.collectionId || '(not set)'}`);
      console.log(`  Config file:   ${paths.DEFAULTS_FILE}`);
      console.log('');

      console.log(`Status: ${ready ? 'Ready' : 'Not configured'}`);
    });

  auth
    .command('clear')
    .description('Remove all stored credentials')
    .action(() => {
      clearConfig();
      success('All credentials cleared');
    });

  return auth;
}
