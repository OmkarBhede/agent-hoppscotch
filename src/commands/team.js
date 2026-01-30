import { Command } from 'commander';
import { graphqlRequest } from '../utils/client.js';
import { output } from '../utils/output.js';
import { MY_TEAMS, TEAM } from '../graphql/queries.js';

export function createTeamCommand(globalOpts) {
  const team = new Command('team')
    .description('Manage Hoppscotch teams');

  team
    .command('list')
    .description('List all teams you belong to')
    .action(async () => {
      const opts = globalOpts();
      const data = await graphqlRequest(MY_TEAMS, {}, opts);
      output(data.myTeams, {
        json: opts.json,
        columns: [
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
          { key: 'myRole', header: 'Role' }
        ]
      });
    });

  team
    .command('find <term>')
    .description('Search teams by name')
    .action(async (term) => {
      const opts = globalOpts();
      const data = await graphqlRequest(MY_TEAMS, {}, opts);
      const filtered = data.myTeams.filter(t =>
        t.name.toLowerCase().includes(term.toLowerCase())
      );

      if (opts.json) {
        output(filtered, { json: true });
      } else {
        if (filtered.length === 0) {
          console.log(`No teams found matching "${term}"`);
        } else {
          console.log(`Found ${filtered.length} team(s) matching "${term}":`);
          filtered.forEach(t => {
            console.log(`  ${t.id} │ ${t.name}`);
          });
        }
      }
    });

  team
    .command('get <teamId>')
    .description('Get team details')
    .action(async (teamId) => {
      const opts = globalOpts();
      const data = await graphqlRequest(TEAM, { teamID: teamId }, opts);

      if (!data.team) {
        console.error(`Team not found: ${teamId}`);
        process.exit(3);
      }

      if (opts.json) {
        output(data.team, { json: true });
      } else {
        const t = data.team;
        console.log(`Team: ${t.name}`);
        console.log(`  ID:      ${t.id}`);
        console.log(`  Role:    ${t.myRole}`);
        console.log(`  Owners:  ${t.ownersCount}`);
        console.log(`  Editors: ${t.editorsCount}`);
        console.log(`  Viewers: ${t.viewersCount}`);
      }
    });

  return team;
}
