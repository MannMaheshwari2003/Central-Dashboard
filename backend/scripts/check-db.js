const service = require('../src/services/database.service');
console.log(JSON.stringify({ datasets: service.listDatasets().length, productionRows: service.getDataset('production_foodgrains')?.rows?.length, nfsaRows: service.getDataset('nfsa_coverage')?.rows?.length }, null, 2));
