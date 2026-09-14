const config = require("../config");
const databaseService = require("../services/database.service");
const datasetService = require("../services/dataset.service");

function getDatasets(req,res){ res.json(datasetService.listDatasets()); }
function getDatasetById(req,res){
  const data = datasetService.loadDataset(req.params.id, req.query.month);
  if (!data) return res.status(404).json({error:`Dataset not found: ${req.params.id}`});
  res.json(data);
}
function getDatasetQuery(req,res){
  const result = datasetService.queryDataset(req.params.id, req.query);
  if (!result) return res.status(404).json({error:`Dataset not found: ${req.params.id}`});
  res.json(result);
}
function exportDataset(req,res){
  const result = datasetService.queryDataset(req.params.id,{...req.query,limit:50000,offset:0});
  if (!result || !result.data?.length) return res.status(404).json({error:"No data to export."});
  const rows=result.data;
  const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const flatRows=rows.map(r=>{
    const out={};
    const walk=(v,p="")=>{
      if(v===null||v===undefined){out[p]="";return;}
      if(Array.isArray(v)){out[p]=v.map(x=>typeof x==="object"?JSON.stringify(x):x).join(", ");return;}
      if(typeof v==="object"){Object.entries(v).forEach(([k,x])=>walk(x,p?`${p}.${k}`:k));return;}
      out[p]=v;
    }; walk(r); return out;
  });
  const all=[...new Set(flatRows.flatMap(r=>Object.keys(r)))];
  const csv=[all.map(esc).join(","),...flatRows.map(r=>all.map(k=>esc(r[k])).join(","))].join("\r\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename="${req.params.id}.csv"`);
  res.send("\ufeff"+csv);
}
function getMetadata(req,res){
  const meta=datasetService.getDatasetMeta(req.params.id);
  if(!meta)return res.status(404).json({error:"Dataset not found"});
  res.json(meta);
}
function getAllMetadata(req,res){res.json({generated_at:new Date().toISOString(),datasets:datasetService.getAllMetadata()});}
function getGeoIndiaStates(req,res){ const geo = databaseService.getGeoJson("india-states"); if(!geo) return res.status(404).json({error:"India states geometry not found in database"}); res.json(geo); }
function getKpis(req,res){try{res.json(datasetService.computeKpis(req.query.month))}catch(e){res.status(500).json({error:"KPI computation failed",detail:e.message})}}
function getStateInfo(req,res){const info=datasetService.getStateInfo(req.params.name);if(!info)return res.status(404).json({error:`No consolidated data found for state: ${req.params.name}`});res.json(info)}
function refresh(req,res){
  const expected = process.env.ADMIN_REFRESH_TOKEN;
  const supplied = req.get("x-admin-refresh-token");
  if (!expected || supplied !== expected) return res.status(403).json({error:"Cache refresh is not authorised."});
  datasetService.clearCache();
  res.json({status:"ok",message:"Dataset cache cleared. Subsequent requests reload files.",refreshed_at:new Date().toISOString()});
}
function getHealth(req,res){res.json({service:config.app.name,status:"ok",version:config.app.version,environment:config.env,datasets:datasetService.loadRegistry().length,api_version:"v1"})}
module.exports={getDatasets,getDatasetById,getDatasetQuery,exportDataset,getMetadata,getAllMetadata,getGeoIndiaStates,getKpis,getStateInfo,refresh,getHealth};
