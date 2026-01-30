import { Command } from 'commander';
import { graphqlRequest } from '../utils/client.js';
import { output, success, error } from '../utils/output.js';
import { getConfig } from '../utils/config.js';
import {
  ROOT_COLLECTIONS_OF_TEAM,
  COLLECTION,
  EXPORT_COLLECTIONS_TO_JSON,
  EXPORT_COLLECTION_TO_JSON
} from '../graphql/queries.js';
import {
  CREATE_ROOT_COLLECTION,
  CREATE_CHILD_COLLECTION,
  DELETE_COLLECTION
} from '../graphql/mutations.js';

export function createCollectionCommand(globalOpts) {
  const collection = new Command('collection')
    .description('Manage Hoppscotch collections (folders)');

  collection
    .command('list')
    .description('List collections in a team or parent collection')
    .option('--team <id>', 'Team ID')
    .option('--parent <id>', 'Parent collection ID (for child collections)')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);

      if (cmdOpts.parent) {
        // List children of a collection
        const data = await graphqlRequest(COLLECTION, { collectionID: cmdOpts.parent }, opts);
        if (!data.collection) {
          error(`Collection not found: ${cmdOpts.parent}`);
          process.exit(3);
        }
        output(data.collection.children || [], {
          json: opts.json,
          columns: [
            { key: 'id', header: 'ID' },
            { key: 'title', header: 'Title' }
          ]
        });
      } else {
        // List root collections
        const teamId = cmdOpts.team || config.teamId;
        if (!teamId) {
          error('--team required (or set default: agent-hoppscotch auth set-default --team <id>)');
          process.exit(4);
        }
        const data = await graphqlRequest(ROOT_COLLECTIONS_OF_TEAM, { teamID: teamId }, opts);
        output(data.rootCollectionsOfTeam, {
          json: opts.json,
          columns: [
            { key: 'id', header: 'ID' },
            { key: 'title', header: 'Title' }
          ]
        });
      }
    });

  collection
    .command('find <term>')
    .description('Search collections by title (searches all collections including nested)')
    .option('--team <id>', 'Team ID')
    .action(async (term, cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }

      // Recursive function to search all collections
      async function searchCollections(collections, parentPath = '') {
        let results = [];
        for (const c of collections) {
          const path = parentPath ? `${parentPath} > ${c.title}` : c.title;
          if (c.title.toLowerCase().includes(term.toLowerCase())) {
            results.push({ ...c, path });
          }
          // Fetch children and search recursively
          const childData = await graphqlRequest(COLLECTION, { collectionID: c.id }, opts);
          if (childData.collection?.children?.length > 0) {
            const childResults = await searchCollections(childData.collection.children, path);
            results = results.concat(childResults);
          }
        }
        return results;
      }

      const data = await graphqlRequest(ROOT_COLLECTIONS_OF_TEAM, { teamID: teamId }, opts);
      const filtered = await searchCollections(data.rootCollectionsOfTeam);

      if (opts.json) {
        output(filtered, { json: true });
      } else {
        if (filtered.length === 0) {
          console.log(`No collections found matching "${term}"`);
        } else {
          console.log(`Found ${filtered.length} collection(s) matching "${term}":`);
          filtered.forEach(c => {
            console.log(`  ${c.id} │ ${c.path}`);
          });
        }
      }
    });

  collection
    .command('get <collectionId>')
    .description('Get collection details')
    .action(async (collectionId) => {
      const opts = globalOpts();
      const data = await graphqlRequest(COLLECTION, { collectionID: collectionId }, opts);

      if (!data.collection) {
        error(`Collection not found: ${collectionId}`);
        process.exit(3);
      }

      if (opts.json) {
        output(data.collection, { json: true });
      } else {
        const c = data.collection;
        console.log(`Collection: ${c.title}`);
        console.log(`  ID:       ${c.id}`);
        console.log(`  Parent:   ${c.parentID || '(root)'}`);
        console.log(`  Children: ${c.children?.length || 0}`);
      }
    });

  collection
    .command('create')
    .description('Create a new collection')
    .option('--team <id>', 'Team ID (for root collection)')
    .option('--parent <id>', 'Parent collection ID (for child collection)')
    .option('--title <title>', 'Collection title')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);

      if (!cmdOpts.title) {
        error('--title required');
        process.exit(4);
      }

      let data;
      if (cmdOpts.parent) {
        // Create child collection
        data = await graphqlRequest(CREATE_CHILD_COLLECTION, {
          collectionID: cmdOpts.parent,
          childTitle: cmdOpts.title
        }, opts);

        if (opts.json) {
          output(data.createChildCollection, { json: true });
        } else {
          success(`Created collection: ${data.createChildCollection.title}`);
          console.log(`  ID: ${data.createChildCollection.id}`);
        }
      } else {
        // Create root collection
        const teamId = cmdOpts.team || config.teamId;
        if (!teamId) {
          error('--team or --parent required');
          process.exit(4);
        }

        data = await graphqlRequest(CREATE_ROOT_COLLECTION, {
          teamID: teamId,
          title: cmdOpts.title
        }, opts);

        if (opts.json) {
          output(data.createRootCollection, { json: true });
        } else {
          success(`Created collection: ${data.createRootCollection.title}`);
          console.log(`  ID: ${data.createRootCollection.id}`);
        }
      }
    });

  collection
    .command('delete <collectionId>')
    .description('Delete a collection')
    .action(async (collectionId) => {
      const opts = globalOpts();
      await graphqlRequest(DELETE_COLLECTION, { collectionID: collectionId }, opts);

      if (opts.json) {
        output({ deleted: true, id: collectionId }, { json: true });
      } else {
        success(`Deleted collection: ${collectionId}`);
      }
    });

  collection
    .command('export')
    .description('Export collections as JSON')
    .option('--team <id>', 'Team ID')
    .option('--collection <id>', 'Single collection ID (optional)')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }

      let data;
      if (cmdOpts.collection) {
        data = await graphqlRequest(EXPORT_COLLECTION_TO_JSON, {
          teamID: teamId,
          collectionID: cmdOpts.collection
        }, opts);
        console.log(data.exportCollectionToJSON);
      } else {
        data = await graphqlRequest(EXPORT_COLLECTIONS_TO_JSON, { teamID: teamId }, opts);
        console.log(data.exportCollectionsToJSON);
      }
    });

  return collection;
}
