const UNIT_DEFS = {
  lakh_mt: { label: "Lakh MT", tonnes: 100000 },
  million_mt: { label: "Million Tonnes", tonnes: 1000000 },
  thousand_mt: { label: "Thousand MT", tonnes: 1000 },
  mt: { label: "MT", tonnes: 1 },
  crore_mt: { label: "Crore MT", tonnes: 10000000 },
};

const MASS_WORDS = [
  "stock", "procurement", "allocation", "offtake", "rice", "wheat", "coarse",
  "foodgrain", "grain", "production", "storage", "capacity", "paddy", "sugar",
  "quantity", "export", "import", "omss", "relief", "commodity", "actual", "norm"
];
const NON_MASS_WORDS = ["person", "population", "coverage", "transaction", "fps", "card", "family", "beneficiary"];

function normalizeUnit(unit) {
  return UNIT_DEFS[unit] ? unit : "lakh_mt";
}

function convert(value, fromUnit, toUnit) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  const from = UNIT_DEFS[fromUnit];
  const to = UNIT_DEFS[normalizeUnit(toUnit)];
  if (!from || !to) return value;
  return Number(((value * from.tonnes) / to.tonnes).toFixed(4));
}

function isMassKey(key, path) {
  const k = String(key || "").toLowerCase();
  const p = `${path}.${k}`.toLowerCase();
  if (NON_MASS_WORDS.some(w => p.includes(w))) return false;
  if (k.endsWith("_lmt") || k.endsWith("_lakh_tons")) return true;
  if (k.endsWith("_lakh") && MASS_WORDS.some(w => p.includes(w))) return true;
  if (k.endsWith("_mt") && MASS_WORDS.some(w => p.includes(w))) return true;
  return false;
}

function sourceUnitForKey(key) {
  const k = String(key || "").toLowerCase();
  if (k.endsWith("_mt") && !k.endsWith("_lmt")) return "million_mt";
  return "lakh_mt";
}

function convertPayload(value, toUnit, path = "") {
  const target = normalizeUnit(toUnit);
  if (Array.isArray(value)) return value.map((v, i) => convertPayload(v, target, `${path}[${i}]`));
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" && isMassKey(key, path)) {
      out[key] = convert(item, sourceUnitForKey(key), target);
    } else {
      out[key] = convertPayload(item, target, path ? `${path}.${key}` : key);
    }
  }
  return out;
}

function unitMiddleware(req, res, next) {
  const unit = normalizeUnit(req.query.unit);
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const converted = convertPayload(body, unit);
    if (converted && typeof converted === "object" && !Array.isArray(converted)) {
      converted.display_unit = UNIT_DEFS[unit].label;
      converted.display_unit_key = unit;
    }
    return originalJson(converted);
  };
  next();
}

module.exports = { UNIT_DEFS, normalizeUnit, convert, convertPayload, unitMiddleware };
